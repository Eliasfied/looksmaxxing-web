// Expand this list only after reviewing the initial page-level SEO and funnel data.
// New posts are not enrolled automatically while the pilot is running.
export const CONTENT_CTA_ROLLOUT = 'article-tool-cta-v1';
export const CONTENT_CTA_PILOT_PATHS = Object.freeze([
  '/blog/looksmaxxing-for-women',
  '/blog/looksmaxxing-tips-and-checklist',
  '/blog/haircut-for-face-shape',
  '/glossary/htn',
  '/glossary/htb-ltb-mtb',
]);

export function isContentCtaEnabled(pathname) {
  return CONTENT_CTA_PILOT_PATHS.includes(pathname);
}

export const ARTICLE_CTA_MARKER = '<!--aura-article-intro-end-->';
