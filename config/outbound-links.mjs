// Policy for links from articles to other sites. Shared by the Markdown
// renderer (existing articles) and the content pipeline (new articles).
//
// - Competitors are never linked: sites and apps that rank for the same
//   looksmaxxing, face-rating or face-shape searches as Aura.
// - Only reference sources (studies, medical bodies, encyclopaedias, .gov and
//   .edu) keep a followed link. Everything else, shops included, is nofollow.
// - Few links: a handful of strong citations beats a link in every sentence,
//   and every extra exit is a reader who never reaches the free preview.

export const MAX_INLINE_LINKS = 3;
export const MAX_SOURCES = 5;

const COMPETITORS = [
  'softmaxx.io', 'trymaxxing.com', 'realworldappeal.com', 'looksmaxxing.guide', 'qoves.com',
  'selfmadenewbie.com', 'fazly.app', 'umax.app', 'looksmax.ai', 'symmetryiq.app', 'looksmeter.com',
  'detect-faceshape.com', 'ovalfaceshape.com', 'oblongfaceshape.com', 'attractivenesstest.co',
  'lookmax-analyzer.com', 'looksmaxxers.com', 'faceshapetool.com', 'faceshapedetector.app',
  'becometen.com', 'thefacereport.com', 'calqora.com', 'photoaistudio.com', 'perfectcorp.com',
  'stylementor.fashion', 'photofeeler.com', 'hairstyleai.com', 'pinkmirror.com',
];

const REFERENCE = [
  'ncbi.nlm.nih.gov', 'pubmed.ncbi.nlm.nih.gov', 'pmc.ncbi.nlm.nih.gov', 'nih.gov', 'sciencedirect.com',
  'nature.com', 'journals.plos.org', 'arxiv.org', 'researchgate.net', 'springer.com', 'link.springer.com',
  'wiley.com', 'onlinelibrary.wiley.com', 'jamanetwork.com', 'bmj.com', 'thelancet.com',
  'aad.org', 'aao.org', 'aapos.org', 'allaboutvision.com', 'optometrists.org', 'mayoclinic.org',
  'clevelandclinic.org', 'my.clevelandclinic.org', 'nhs.uk', 'who.int', 'healthline.com',
  'medicalnewstoday.com', 'webmd.com', 'britannica.com', 'wikipedia.org', 'en.wikipedia.org',
  'wiktionary.org', 'en.wiktionary.org', 'merriam-webster.com',
];

export function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

const matches = (host, list) => list.some((d) => host === d || host.endsWith('.' + d));

/** 'own' | 'competitor' | 'reference' | 'other' (shops, clinics, blogs). */
export function classifyLink(url) {
  const host = hostOf(url);
  if (!host) return 'own';
  if (host === 'aura-looksmaxxing.com' || host.endsWith('.aura-looksmaxxing.com')) return 'own';
  if (matches(host, COMPETITORS)) return 'competitor';
  if (matches(host, REFERENCE) || /\.(gov|edu)$/.test(host) || /\.(gov|ac|edu)\.[a-z]{2}$/.test(host)) return 'reference';
  return 'other';
}

export function relFor(kind) {
  return kind === 'reference' ? 'noopener' : 'nofollow noopener';
}

/**
 * Which inline external links to keep, by position. References first, then
 * other sites, each in reading order; competitors never. `urls` is the list of
 * external link URLs in document order.
 */
export function keptInlineLinks(urls, max = MAX_INLINE_LINKS) {
  const ranked = urls
    .map((url, index) => ({ url, index, kind: classifyLink(url) }))
    .filter((l) => l.kind === 'reference' || l.kind === 'other');
  const seen = new Set();
  const keep = new Set();
  for (const pass of ['reference', 'other']) {
    for (const l of ranked) {
      if (keep.size >= max) break;
      if (l.kind !== pass || seen.has(l.url)) continue;
      seen.add(l.url);
      keep.add(l.index);
    }
  }
  return keep;
}

/** Short source list: no competitors, no duplicates, references first. */
export function capSources(sources, max = MAX_SOURCES) {
  if (!Array.isArray(sources)) return [];
  const seen = new Set();
  const usable = sources.filter((s) => {
    if (!s || typeof s.url !== 'string' || typeof s.title !== 'string') return false;
    const kind = classifyLink(s.url);
    if (kind === 'competitor' || kind === 'own' || seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  });
  const rank = (s) => (classifyLink(s.url) === 'reference' ? 0 : 1);
  return usable
    .map((s, i) => ({ s, i }))
    .sort((a, b) => rank(a.s) - rank(b.s) || a.i - b.i)
    .slice(0, max)
    .map(({ s }) => ({ ...s, rel: relFor(classifyLink(s.url)) }));
}
