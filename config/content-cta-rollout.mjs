// The article tool CTA is live on every blog and glossary page. The marker below
// separates each version: v3 puts the free tool first and the 30-day plan second
// (the plan first only on plan and routine topics), after v2 and the pilot.
export const CONTENT_CTA_ROLLOUT = 'article-cta-v3-tool-first';

export function isContentCtaEnabled() {
  return true;
}

export const ARTICLE_CTA_MARKER = '<!--aura-article-intro-end-->';
