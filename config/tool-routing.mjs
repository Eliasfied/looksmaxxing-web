import catalog from './tools.json' with { type: 'json' };
export const toolCatalog = catalog;

/** Choose a real, implemented tool from search intent, not generic body mentions. */
export function relevantTool(text, explicitSlug) {
  if (explicitSlug) return catalog.find(t => t.slug === explicitSlug) ?? null;
  const words = text.toLowerCase().replace(/-/g, ' ');
  const women = /\b(women|woman|female|girl|htb|ltb|mtb)\b/.test(words);
  let slug;
  if (/\b(clavicle|height|bonesmash|surgery|steroid|supplement|workout)\b/.test(words)) return null;
  if (/\b(hair|haircuts?|hairstyles?|bangs|fringes?|hairline)\b/.test(words)) slug = women ? 'hairstyle-finder-for-women' : 'haircut-recommendation-tool';
  else if (/\b(glow up|routine|plan|checklist|skincare)\b/.test(words)) slug = 'glow-up-planner';
  else if (women) slug = 'face-analysis-for-women';
  else if (/face shape/.test(words)) slug = 'face-shape-detector';
  else if (/symmetr/.test(words)) slug = 'symmetry-analyzer';
  else if (/canthal|eye|tilt/.test(words)) slug = 'canthal-tilt-checker';
  else if (/jaw|gonial|mandible/.test(words)) slug = 'jawline-analyzer';
  else if (/mewing|progress|before after/.test(words)) slug = 'mewing-tracker';
  else if (/psl|scale|score|chart/.test(words)) slug = 'psl-score-calculator';
  else slug = 'ai-face-rating';
  return catalog.find(t => t.slug === slug) ?? null;
}

export function toolHref(slug, source, appUrl = 'https://app.aura-looksmaxxing.com') {
  if (!catalog.some(t => t.slug === slug)) throw new Error('Unknown tool');
  return `${appUrl.replace(/\/$/, '')}/tools/${slug}?source=${encodeURIComponent(source)}`;
}
