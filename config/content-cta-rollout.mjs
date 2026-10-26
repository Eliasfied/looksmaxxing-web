// The article tool CTA is live on every blog and glossary page. The marker below
// stays so analytics can separate this rollout from the earlier five-page pilot.
export const CONTENT_CTA_ROLLOUT = 'article-tool-cta-v2-all';

export function isContentCtaEnabled() {
  return true;
}

export const ARTICLE_CTA_MARKER = '<!--aura-article-intro-end-->';
