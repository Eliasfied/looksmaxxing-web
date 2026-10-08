import { ARTICLE_CTA_MARKER, isContentCtaEnabled } from '../config/content-cta-rollout.mjs';

// Insert a build-time boundary between complete Markdown blocks. Never split
// paragraphs, links, lists or raw HTML to make room for a promotion.
export default function remarkArticleCta() {
  return (tree, file) => {
    const fm = file.data?.astro?.frontmatter ?? {};
    if (fm.term || fm.h1 || !isContentCtaEnabled(`/blog/${fm.slug}`)) return;
    const boundary = tree.children.findIndex(node => node.type === 'heading' && node.depth <= 2);
    const hasIntroduction = tree.children.slice(0, boundary).some(node =>
      node.type === 'paragraph' && node.children.some(child => child.type !== 'image')
    );
    // A short article or one starting with a heading keeps only the end CTA.
    if (boundary <= 0 || !hasIntroduction) return;
    tree.children.splice(boundary, 0, { type: 'html', value: ARTICLE_CTA_MARKER });
  };
}
