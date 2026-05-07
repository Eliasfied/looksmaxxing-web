#!/usr/bin/env node
/**
 * One-shot keyword analyzer:
 *  - Loads both Ubersuggest CSVs
 *  - Filters out drama, celebrities, steroids, phenotype, suicide, forum-internal
 *  - Clusters keywords by theme
 *  - Assigns page_type (tool/blog/glossary)
 *  - Prints final cluster counts
 */

import fs from 'fs';
import path from 'path';

const F1 = 'C:/Users/Elias/Downloads/ubersuggest_looksmaxxing (1).csv';
const F2 = 'C:/Users/Elias/Downloads/ubersuggest looksmax.org.csv';

// ─── CSV parser (handles quoted fields with commas) ──────────────────────────
function parseCsv(text) {
  const rows = [];
  let row = [], cur = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (c === '\r') {} else cur += c;
    }
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

function loadCsv(filePath, volCol, kwCol) {
  const text = fs.readFileSync(filePath, 'utf-8');
  const rows = parseCsv(text).slice(1).filter(r => r.length > Math.max(volCol, kwCol));
  return rows.map(r => ({
    keyword: (r[kwCol] || '').trim().toLowerCase(),
    volume: parseInt((r[volCol] || '0').replace(/[^0-9]/g, ''), 10) || 0,
  })).filter(x => x.keyword);
}

const list1 = loadCsv(F1, 2, 1); // Suchvolumen, Keyword
const list2 = loadCsv(F2, 2, 1); // Volume, Keywords

// Merge & dedupe (keep max volume)
const merged = new Map();
for (const { keyword, volume } of [...list1, ...list2]) {
  const cur = merged.get(keyword) || 0;
  if (volume > cur) merged.set(keyword, volume);
}
const all = [...merged.entries()].map(([keyword, volume]) => ({ keyword, volume }));
console.log(`\n📊 Total unique keywords: ${all.length}`);

// ─── BLOCKLIST: filter trash ─────────────────────────────────────────────────
const BLOCK_PATTERNS = [
  // Steroids / HGH / hard drugs
  /\b(hgh|tren|trenbolone|steroid|sarm|sarms|rad ?140|cialis|finasteride|enclomiphene|chemyo|receptor.?chem|peptide|peptides|melanotan|monobenzone|aqualyx|dnp)\b/,
  // Phenotype / race
  /\b(nordid|atlantid|cromagnid|brunn|brünn|dalofaelid|keltic|phenotype|jbw|castizo|indo nordic|hallstatt|wasian|slavic white|race|races|racial|ethnicity|jewish|asian.*chad|black girls|white pilled|whitepill|skin tone|skin color|skin whiten)\b/,
  // Suicide / extreme
  /\b(rope ?max|ropemax|suicide|kill.*self|burned.*alive|cartel|gore|flaying)\b/,
  // Forum-user / drama / specific people
  /\b(clavicular|salludon|wheat waffles|ehren|astrosky|amnesia|pneumo|dr3amlicid|knajjd|bassandroxk|syrian psycho|jessie|james sapphire|gerbert johnson|rehab room|legoman|st blackops|edvin balyans|maddie kowalski|ice spice|negin|tiara brianna|jason luv|monique brown|ana de armas|adriana lima|alexa demie|sydney sweeney|gal gadot|barbara palvin|yael shelbia|doutzen kroes|mia goth|madison beer|jinnytty|eva elfie|eva cudmore|cocoxcohen|leonarda jonie|shana cohen|bonnie blue|greta thunberg)\b/,
  // Celebrity drama
  /\b(jordan barrett|alain delon|marlon brando|david gandy|sean o'?pry|henry cavill|chris evans|jensen ackles|robert pattinson|johnny depp|timothée chalamet|timothee chalamet|brad pitt|ian somerhalder|chace crawford|tristan tate|andrew tate|tom welling|matt bomer|francisco lachowski|hernan drago|lorenzo zurzolo|alfredo|kumail nanjiani|frank tufano|david laid|zyzz|joey swoll|joe fazer|jeff seid|aaron marino|jeremy fragrance|jon zherka|zherka|jon skywalker|dean withers|gypsy crusader|elliot rodger|richard ramirez|patrick bateman|jeremy meeks|luigi mangione|haruma miura|charles leclerc|miguel o.?hara|pierre boo|liam payne|zayn malik|jared leto|al pacino|chris hemsworth|ben shapiro|ezra miller|ash kash|bonnie|jfk|tyler1|tyler posey|hasan piker|vinnie hacker|duke dennis|joey|nick|coreyo|tate|spider|spiderman|salludon|aleksa|jbrs|cameron alborzian|gio scotti|alex schlab|isaac moreno|kilian isaak|sigismund|sahib faber|broderick hunter|kyle kuznik|brando erba|alfredo de la cruz|mason thames|moritz hau|elias depoot|elias de poot|frederic bittner|max henhappel|max henappel|ethan muth|king68|jarion davidson|sam dezz|sam zia|legoman|kai cunningham|edgar|pierre|jbs|ludi lin|leif stacey|bimboubermensch|dean withers|king68thegreat|alex schlab|jynxzi|tyler maher|coolcicada|edvin|wentworth miller|chad chad|joe fazer|elliot|negin ghalavand|negin vand|nocturnal kent|chang triad|alexander zanoza|andreas eriksen|archie cranch|dr3amlicid|st blackops2cel|rommulas|romulus|hullo|zillakami|laurence coke|sulumbek|mike thurston|soosh|ilia topuria|soltego|haruma|brando|nocturnal|dbdr face|true adam|androgenic|orb|bass|knajjd|salludon|ehren edit|salludon)\b/,
  // Random off-niche
  /\b(wing zone|maewing|ark ascended|unitedhealthcare|champagne piracy|onlyfans|girlsdoporn|piracy wiki|target self checkout|4chan|reddit|discord server|tiktok|tiktoker|youtuber|dnrd|six gorillion|forwardsfromklandma|erome|obo surgery|how to post|car accident|mug shot|mugshot|gerbert|gypsy|coreyo|incel meaning in hindi|are humans devolving|sanasa|sanasa meaning|champagne)\b/,
  // Questionable claims / dangerous DIY
  /\b(diy invisalign|how to bonesmash|edge ?max|edging|edgemax|coomer|gooner|gooning|larping|larp|fapping|nofap|nut|nofap|dimorphism|bracesshop)\b/,
  // Misc noise we don't want to write content for
  /\b(blacked|jbw|board|forum|forum drama|net worth|net.worth|height fraud|height frauding|girlfriend|boyfriend|ethnicity|how old is|how tall is|how much does .* weigh|when did .* peak|with hair|without makeup|without hair|prom photo|reveal|leaked|pic|picture|photo of|photos|photo|hospitalized|crash|wife)\b/,
];

const ALLOWLIST_OVERRIDE = [
  // Keywords that match block but are still useful generic queries
  /^(face rating|psl|mewing|hunter eyes|canthal tilt|jawline|attractiveness|looksmax|maxilla|cheekbones|side profile|mogging|chad|chadlite|stacy|becky|normie|sub ?[35]|ltn|htn|mtn|htb|ltb|mtb|smv|jfl|khhv|nt|bp|orb|fwhr|ipd|esr|pfl)/,
];

function isBlocked(kw) {
  for (const a of ALLOWLIST_OVERRIDE) if (a.test(kw)) {
    // even allowlist must not match HARD blockers
    if (/\b(hgh|steroid|tren|sarm|trenbolone|peptide|phenotype|jewish|cartel|rope.?max|suicide|gore)\b/.test(kw)) return true;
    return false;
  }
  return BLOCK_PATTERNS.some(p => p.test(kw));
}

const filtered = all.filter(x => !isBlocked(x.keyword));
console.log(`✅ After filter: ${filtered.length} (removed ${all.length - filtered.length})`);

// ─── CLUSTERING ──────────────────────────────────────────────────────────────
// Each cluster: regex test + page_type + slug
const CLUSTERS = [
  // ─── TOOLS (highest conversion to app) ───
  { name: 'psl-score-calculator', type: 'tool',
    test: /\b(psl scale|psl rating|psl chart|psl rater|psl score|psl looks|psl meaning|psl 4|psl stand|what is psl|wtf is psl|complete guide to psl|psl looksmax|psl face rating|psl rating test|what does psl|psl women|psl woman|female psl|psl tier|psl beam|psl post)\b/ },
  { name: 'face-rating-ai', type: 'tool',
    test: /\b(face rating|face ratings|rate.*face|rating.*face|attractiveness test|attractiveness scale|chatgpt attractiveness|chatgpt looksmax|looksmax gpt|free looksmax ai|ai looksmax|ai looksmaxxing|psl rater|psl scale ai|attractiveness test ai|attractiveness test app|attractiveness test online|attractiveness test photo|attractiveness test picture|looksmax rate|looksmax ai|looksmax report|looksmax face|looks maxxer|5 scale rating|7\.5 out of 10|beauty scale)\b/ },
  { name: 'face-shape-detector', type: 'tool',
    test: /\b(face shape|oval.*face|diamond.*face|square.*face|heart.*face|round.*face|most attractive face shape)\b/ },
  { name: 'canthal-tilt-checker', type: 'tool',
    test: /\b(canthal tilt|positive canthal|negative canthal|canthal tilt looksmax|fix canthal|canthal tilt eyes|positive vs negative|negative vs positive|tilt eye|orbital vector)\b/ },
  { name: 'jawline-analyzer', type: 'tool',
    test: /\b(jawline|jaw shape|jaw shapes|chad jaw|gonial angle|measure gonial|measure fwhr|fwhr|harmony score|harmony calculator|face ratio calculator|mog face|how to mog)\b/ },
  { name: 'haircut-face-shape-tool', type: 'tool',
    test: /\b(haircut.*face|hairstyle.*face|haircut for|hair for face|best hairstyle|hairmaxxing)\b/ },
  { name: 'mewing-progress-tracker', type: 'tool',
    test: /\b(mewing tracker|mewing app|mewing progress|track mewing|mewing results|mewing transformation|mewing photo)\b/ },

  // ─── PILLAR PAGES (short-tail mega keywords) ───
  { name: 'looksmaxxing-pillar', type: 'blog',
    test: /^(looksmax|looksmaxx|looksmaxxing|looksmaxing|looksmaxer|how to looksmax|looksmax meme|looksmax forum|looksmax org|org looksmaxxing|looks ?maxx?er)$/ },
  { name: 'psl-pillar', type: 'blog',
    test: /^(psl|what psl|psl ratings|psl 4|psl 5|psl 6|psl 7|psl post size|psl beam size|psl meaning|psl slang)$/ },
  { name: 'facial-aesthetics-pillar', type: 'blog',
    test: /\b(facial aesthetics|face forward aesthetics|face first aesthetics|mov aesthetics|facial aesthetics concepts|aesthetic|aesthetics)\b/ },

  // ─── BLOG (informational, how-to, guide) ───
  { name: 'looksmaxxing-guide', type: 'blog',
    test: /\b(looksmax(?:ing|xing)? guide|complete looksmax|how to looksmax|looksmax tips|looksmaxxing tips|looksmaxxing checklist|looksmaxxing chart|looksmax chart|looksmax(?:ing|xing)? tier|looksmaxxing ranks|looksmaxxing rating|looksmax(?:ing|xing)? scale|looksmax website|looksmaxxing\.com|looksmaxxing for men|looksmaxxing men|looksmaxing men|looksmax(?:ing|xing)? before|looksmax(?:ing|xing)? transformation|looksmax(?:ing|xing)? products|looksmax kit|looksmax filter|how to looksmaxx|how to ascend)\b/ },
  { name: 'looksmaxxing-women', type: 'blog',
    test: /\b(looksmax women|looksmax(?:ing|xing)? women|looksmax(?:ing|xing)? woman|looksmax women|female looksmax|looksmaxxing female|psl scale woman|psl scale women|attractiveness scale female|stacy looksmax)\b/ },
  { name: 'mewing-complete-guide', type: 'blog',
    test: /\b(mewing|mewing meaning|mewing definition|mewing tutorial|mewing exercises|mewing benefits|mewing posture|mewing tongue|mewing teeth|mewing jaw|mewing chad|mewing face|mewing trend|mewing meme|mewing device|mewing tool|mewing before|mewing transformation)\b/ },
  { name: 'hunter-eyes-guide', type: 'blog',
    test: /\b(hunter eyes|prey eyes|almond eyes|hunter eye surgery|how to.*hunter eyes|deep set eyes|small eyes men|negative hooding|upper eyelid exposure|orb oculi|hooded eyes)\b/ },
  { name: 'maxilla-guide', type: 'blog',
    test: /\b(maxilla|recessed maxilla|flat maxilla|forward maxilla|projected maxilla|good maxilla|bad maxilla|upper maxilla|lower maxilla|fix.*maxilla|maxilla recessed|recessed midface|midface|forward growth|downward growth|grow maxilla)\b/ },
  { name: 'jawline-improvement-guide', type: 'blog',
    test: /\b(jawline|jaw improvement|jawline improvement|jawline development|sharp jawline|sharpen.*jaw|jawmax|jawmaxxing|jaw maxxing|jaw filler|chin filler|chin filler migrate|jawline enhancer|jaw stop growing|how to mog|mogging meaning|jutting jaw|jaw exercise|chin sticks out)\b/ },
  { name: 'cheekbones-guide', type: 'blog',
    test: /\b(cheekbones|cheek bones|malar bones|zygos|zygo|zygo pull|zygomatic|bizygomatic|hollow cheeks|high cheekbones|low cheekbones|recessed cheekbones|recessed zygos|medium set cheekbones|high set vs low|towel pulling|skull crusher)\b/ },
  { name: 'bonesmashing-truth', type: 'blog',
    test: /\b(bone ?smash|bonesmash|does bonesmashing|bonesmashing guide|bonesmashing results|how to bonesmash)\b/ },
  { name: 'mens-skincare-routine', type: 'blog',
    test: /\b(skincare|skin routine|kojic|accutane before|hyperpigmentation|under ?eye|eye area skincare|nasolabial|mentolabial|itachi lines|dark circle)\b/ },
  { name: 'beard-growth-guide', type: 'blog',
    test: /\b(beard|minoxidil for beard|grow.*beard|beard growth|facial hair|beard with minoxidil|disconnected beard|beard mustache|stubble|clean shav)\b/ },
  { name: 'eyebrow-maxxing', type: 'blog',
    test: /\b(eyebrow|eyebrows|brows|eyebrow dye|dye eyebrows|dyeing eyebrows|thicken eyebrows|ideal eyebrows|optimal eyebrow|low set eyebrow|lower eyebrows|arched eyebrow|asymmetrical eyebrow|fix.*eyebrow|positive tilt eyebrow|tilted brow|eyebrow ratio|distance between eyebrows|how far apart should eyebrows)\b/ },
  { name: 'eyelash-growth', type: 'blog',
    test: /\b(eyelash|eyelashes|lashes|minoxidil.*eyelash|dye.*eyelash|curl.*eyelash|eyelash curler|latisse|orbital fat loss|vaseline.*lash)\b/ },
  { name: 'haircut-styles-face-shape', type: 'blog',
    test: /\b(haircut|hairstyle|hair style|zyzz hair|hair guide)\b/ },
  { name: 'teeth-smile-guide', type: 'blog',
    test: /\b(teeth smile|tooth smile|6 teeth|8 tooth|10 teeth|12 teeth|smile tooth|narrow palate|wide palate|palate width|sharp.*canine|canine teeth|sharpening canine|6 tooth smile|invisalign|braces)\b/ },
  { name: 'face-symmetry-harmony', type: 'blog',
    test: /\b(facial symmetry|asymmetry|facial harmony|facial convexity|side profile|chin to philtrum|philtrum length|ideal philtrum|chin philtrum|midface ratio|fwhr|ipd|interpupillary|esr|eye separation|eye spacing|ideal ipd|nose ratio|ideal nose|male nose|chad side profile|perfect side profile|ideal eye)\b/ },
  { name: 'mens-grooming-essentials', type: 'blog',
    test: /\b(cologne|fragrance|scent ?max|pheromone|kohl eyeliner|mascara men|men.*makeup|softmax|hardmax|softmaxx|hardmaxx|soft maxing|hard maxxing)\b/ },
  { name: 'height-frame-guide', type: 'blog',
    test: /\b(height|heightmax|heightmaxxing|height mog|tall|manlet|dwarf|frame mog|narrow clavicle|wide clavicle|clavicle width|narrow.*clavicle|frame|broad shoulders|how to get wider|inversion table|clavicle stop growing|when do clavicles)\b/ },
  { name: 'body-fat-face', type: 'blog',
    test: /\b(body fat.*face|face fat|debloat|bloat|debloating|body fat percentage|abs visible|potassium maxx|carrot max)\b/ },
  { name: 'masseter-training', type: 'blog',
    test: /\b(masseter|chewing|hard chew|jaw exercise|incisor chewing|mastic gum)\b/ },
  { name: 'forward-growth-mewing', type: 'blog',
    test: /\b(forward growth|forward grown|hyoid|raise hyoid|hyoid bone|hyoid exercise|tongue posture|palate expansion)\b/ },
  { name: 'before-after-transformations', type: 'blog',
    test: /\b(before and after|before & after|before after|transformation pic|transformation photo)\b/ },

  // ─── GLOSSARY (definitions / slang) ───
  { name: 'gloss-htn', type: 'glossary', test: /\b(htn|what is htn|htn meaning|htn face|htn looksmax|htn slang|htn chart)\b/ },
  { name: 'gloss-ltn', type: 'glossary', test: /\b(ltn|what is ltn|ltn meaning|ltn face|ltn looksmax|ltn slang|ltn chart|ltn scale)\b/ },
  { name: 'gloss-mtn', type: 'glossary', test: /\b(mtn|what is mtn|mtn meaning|mtn looksmax|mtn slang|mtn vs htn|mtn medical)\b/ },
  { name: 'gloss-htb-ltb-mtb', type: 'glossary', test: /\b(htb|ltb|mtb|htb meaning|ltb meaning|mtb meaning|ltb mtb htb)\b/ },
  { name: 'gloss-jbw', type: 'glossary', test: /\b(jbw|jbw meaning|jbw theory|definition of jbw)\b/ },
  { name: 'gloss-bp', type: 'glossary', test: /\b(\bbp\b|what does bp mean|bp meaning|bp scale|bp edit|bp slang|bp tiktok)\b/ },
  { name: 'gloss-smv', type: 'glossary', test: /\b(smv|what does smv mean|smv meaning|smv chad)\b/ },
  { name: 'gloss-jfl', type: 'glossary', test: /\b(jfl|what does jfl|jfl meaning|jfl looksmax)\b/ },
  { name: 'gloss-khhv', type: 'glossary', test: /\b(khhv|what does khhv|what is khhv)\b/ },
  { name: 'gloss-foid', type: 'glossary', test: /\b(foid|foid meaning|hypergamous foid)\b/ },
  { name: 'gloss-dbdr', type: 'glossary', test: /\b(dbdr|dbdr face|dbdr meaning|dbdr reddit)\b/ },
  { name: 'gloss-mogging', type: 'glossary', test: /\b(mogging|mog meaning|mogger|height mog|frame mog|mogging meaning)\b/ },
  { name: 'gloss-chad', type: 'glossary', test: /\b(\bchad\b|chad meaning|gigachad|giga chad|mexican chad)\b/ },
  { name: 'gloss-chadlite', type: 'glossary', test: /\b(chadlite|chad lite|chadlite meaning|chadlite face|chadlite chart|what is a chadlite)\b/ },
  { name: 'gloss-stacy', type: 'glossary', test: /\b(stacy|stacy meaning|stacylite|stacy looksmax|true stacy|high tier becky|low tier becky|mid tier becky|becky)\b/ },
  { name: 'gloss-normie', type: 'glossary', test: /\b(normie|low tier normie|mid tier normie|normie meaning|high tier normie)\b/ },
  { name: 'gloss-truecel-fakecel', type: 'glossary', test: /\b(truecel|fakecel|greycel|grey ?cel|wristcel|mentalcel|iqcel|iqlet|baraka)\b/ },
  { name: 'gloss-sub5-sub3', type: 'glossary', test: /\b(sub ?5|sub ?3|sub5 face|sub5 male|sub5 human|sub 5 looksmax|what is a sub5)\b/ },
  { name: 'gloss-softmax-hardmax', type: 'glossary', test: /\b(softmax|softmaxxing|hardmax|hardmaxxing|soft max|hard max|what is softmax)\b/ },
  { name: 'gloss-jestermaxxing', type: 'glossary', test: /\b(jestermax|jester max)\b/ },
  { name: 'gloss-heightmaxxing', type: 'glossary', test: /\b(heightmax|height max|heightpill|dwarfmax)\b/ },
  { name: 'gloss-iqmaxxing-brainmaxxing', type: 'glossary', test: /\b(iqmax|iq max|brainmax|brain max|lifemax|life max)\b/ },
  { name: 'gloss-geomaxxing', type: 'glossary', test: /\b(geomax|geo max)\b/ },
  { name: 'gloss-bloatmaxxing', type: 'glossary', test: /\b(bloatmax|bloat max)\b/ },
  { name: 'gloss-fwhr-ipd-esr', type: 'glossary', test: /\b(fwhr looksmax|ipd looksmax|esr looksmax|pfl looksmax|fwhr meaning|ipd meaning|what is fwhr|what is ipd)\b/ },
  { name: 'gloss-orbital', type: 'glossary', test: /\b(orb meaning|orb looksmax|recessed orbitals|recessed infraorbitals|recessed infras|infraorbital)\b/ },
  { name: 'gloss-oofy-doofy', type: 'glossary', test: /\b(oofy doofy|oofy doofy meaning)\b/ },
  { name: 'gloss-jestermaxxing', type: 'glossary', test: /\b(jestermax|jester max|jestermaxxing)\b/ },
  { name: 'gloss-goyslop', type: 'glossary', test: /\b(goyslop|goy slop)\b/ },
  { name: 'gloss-caging', type: 'glossary', test: /\b(caging|caging meaning|cage slang|cage looksmax)\b/ },
  { name: 'gloss-jbw', type: 'glossary', test: /\b(jbw|jbw theory|jbw meaning|definition of jbw)\b/ },
  { name: 'gloss-dbdr', type: 'glossary', test: /\b(dbdr|dbdr meaning)\b/ },
  { name: 'gloss-larp-ascend', type: 'glossary', test: /\b(larp|urban dictionary larp|larping|ascend|ascension|ascender|how to ascend)\b/ },
  { name: 'gloss-pheromone', type: 'glossary', test: /\b(pheromone|pheromone max|scent ?max|cologne max)\b/ },
  { name: 'gloss-bonesmash', type: 'glossary', test: /\b(bonesmash|bone smash|smashing bones)\b/ },
  { name: 'gloss-frame', type: 'glossary', test: /\b(framecel|frame mog|wide frame|narrow frame|lanky frame|stocky)\b/ },
  { name: 'gloss-misc-slang', type: 'glossary', test: /\b(nt slang|what does nt|whitepill|black ?pill|blackpill scale|blackpill tier|blackpill rating|appeal vs psl|cope|larping|hagmax|hagmaxxing|cologne max|edge ?max|edgemax|fraudmax|fraudmaxxing|halo|halo effect)\b/ },
];

// Assign each keyword to first matching cluster
const buckets = new Map();
const unmatched = [];
for (const cluster of CLUSTERS) buckets.set(cluster.name, { ...cluster, keywords: [], totalVolume: 0 });

for (const item of filtered) {
  let matched = false;
  for (const cluster of CLUSTERS) {
    if (cluster.test.test(item.keyword)) {
      const b = buckets.get(cluster.name);
      b.keywords.push(item);
      b.totalVolume += item.volume;
      matched = true;
      break;
    }
  }
  if (!matched) unmatched.push(item);
}

// ─── REPORT ──────────────────────────────────────────────────────────────────
const byType = { tool: [], blog: [], glossary: [] };
for (const b of buckets.values()) byType[b.type].push(b);

for (const type of ['tool', 'blog', 'glossary']) {
  const list = byType[type].filter(b => b.keywords.length > 0).sort((a, b) => b.totalVolume - a.totalVolume);
  console.log(`\n━━━ ${type.toUpperCase()} (${list.length} pages) ━━━`);
  for (const b of list) {
    console.log(`  ${b.name.padEnd(38)} ${b.keywords.length.toString().padStart(4)} kw  ${b.totalVolume.toLocaleString().padStart(8)} vol`);
  }
}

const empty = [...buckets.values()].filter(b => b.keywords.length === 0).map(b => b.name);
if (empty.length) console.log(`\n⚠️  Empty clusters (no matching kw): ${empty.join(', ')}`);

console.log(`\n📋 SUMMARY`);
console.log(`  Total unique kw:     ${all.length}`);
console.log(`  After filtering:     ${filtered.length}`);
console.log(`  Matched to cluster:  ${filtered.length - unmatched.length}`);
console.log(`  Unmatched (orphans): ${unmatched.length}`);

const totalPages = byType.tool.filter(b => b.keywords.length).length
  + byType.blog.filter(b => b.keywords.length).length
  + byType.glossary.filter(b => b.keywords.length).length;
console.log(`\n🎯 PAGES TO GENERATE: ${totalPages}`);
console.log(`     Tools:    ${byType.tool.filter(b => b.keywords.length).length}`);
console.log(`     Blog:     ${byType.blog.filter(b => b.keywords.length).length}`);
console.log(`     Glossary: ${byType.glossary.filter(b => b.keywords.length).length}`);

// Unmatched preview
if (unmatched.length) {
  console.log(`\n📝 Top 30 unmatched keywords (by volume):`);
  unmatched.sort((a, b) => b.volume - a.volume).slice(0, 30).forEach(x => {
    console.log(`     ${x.volume.toString().padStart(6)}  ${x.keyword}`);
  });
}
