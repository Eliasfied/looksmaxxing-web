import { classifyLink, keptInlineLinks, relFor } from '../config/outbound-links.mjs';

// Enforce the outbound link policy at build time, so published articles are
// corrected without rewriting their text: links beyond the cap and links to
// competitors become plain text, and every external link gets a rel.
export default function remarkOutboundLinks() {
  return (tree) => {
    const external = [];
    const collect = (node, parent, index) => {
      if (node.type === 'link' && /^https?:\/\//.test(node.url ?? '') && classifyLink(node.url) !== 'own')
        external.push({ node, parent, index });
      (node.children ?? []).forEach((child, i) => collect(child, node, i));
    };
    collect(tree, null, -1);
    if (!external.length) return;

    const keep = keptInlineLinks(external.map((l) => l.node.url));
    // Unlink from the end so earlier indices in the same parent stay valid.
    for (let i = external.length - 1; i >= 0; i--) {
      const { node, parent, index } = external[i];
      if (keep.has(i)) {
        node.data ??= {};
        node.data.hProperties = { ...node.data.hProperties, rel: relFor(classifyLink(node.url)), target: '_blank' };
      } else if (parent) {
        parent.children.splice(index, 1, ...(node.children ?? []));
      }
    }
  };
}
