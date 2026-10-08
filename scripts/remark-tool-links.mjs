import { relevantTool, toolHref } from '../config/tool-routing.mjs';
import { CONTENT_CTA_ROLLOUT, isContentCtaEnabled } from '../config/content-cta-rollout.mjs';

// Adjust only old generic app links at build time. Published article text,
// slugs and titles remain unchanged; specific deep links are preserved.
export default function remarkToolLinks() {
  return (tree, file) => {
    const fm = file.data?.astro?.frontmatter ?? {};
    if (!fm.slug) return;
    const section = fm.term ? 'glossary' : fm.h1 ? 'tools' : 'blog';
    const source = '/' + section + '/' + fm.slug;
    if (section !== 'tools' && !isContentCtaEnabled(source)) return;
    const tool = relevantTool((fm.title ?? fm.term ?? '') + ' ' + (fm.primary_keyword ?? ''), fm.tool_slug);
    const appUrl = process.env.PUBLIC_APP_URL ?? 'https://app.aura-looksmaxxing.com';
    const destination = tool ? toolHref(tool.slug, source, appUrl) : appUrl + '/tools';
    const visit = node => {
      if (node.type === 'link' && /^https:\/\/app\.aura-looksmaxxing\.com\/?(?:register\/?|login\/?)?$/.test(node.url ?? '')) {
        node.url = destination;
        node.data ??= {};
        node.data.hProperties = {
          ...node.data.hProperties,
          'data-tool': tool?.slug,
          'data-placement': `${section}-inline`,
          ...(isContentCtaEnabled(source) ? { 'data-cta-rollout': CONTENT_CTA_ROLLOUT } : {}),
        };
      }
      for (const child of node.children ?? []) visit(child);
    };
    visit(tree);
  };
}
