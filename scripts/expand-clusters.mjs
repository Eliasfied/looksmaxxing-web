#!/usr/bin/env node
/**
 * expand-clusters.mjs
 *
 * Builds the master keywords.csv from:
 *  - The two raw Ubersuggest CSVs in ~/Downloads
 *  - Programmatic patterns added on top (face-shape × haircut, comparisons, etc.)
 *
 * Output schema:
 *   keyword,volume,sd,cluster,slug,status,page_type,primary,phase
 *
 * Run:  node scripts/expand-clusters.mjs
 * Output:  apps/marketing/src/data/keywords.csv
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const F1 = 'C:/Users/Elias/Downloads/ubersuggest_looksmaxxing (1).csv';
const F2 = 'C:/Users/Elias/Downloads/ubersuggest looksmax.org.csv';
const OUT = path.join(ROOT, 'apps/marketing/src/data/keywords.csv');

// ─── CSV parser ──────────────────────────────────────────────────────────────
function parseCsv(text) {
  const rows = []; let row = [], cur = '', inQ = false;
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

function loadCsv(filePath, volCol, kwCol, sdCol = null) {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Missing input: ${filePath}`);
    return [];
  }
  const text = fs.readFileSync(filePath, 'utf-8');
  const rows = parseCsv(text).slice(1).filter(r => r.length > Math.max(volCol, kwCol));
  return rows.map(r => ({
    keyword: (r[kwCol] || '').trim().toLowerCase(),
    volume: parseInt((r[volCol] || '0').replace(/[^0-9]/g, ''), 10) || 0,
    sd: sdCol !== null ? parseInt((r[sdCol] || '0').replace(/[^0-9]/g, ''), 10) || 0 : 0,
  })).filter(x => x.keyword);
}

// ─── Filter (same blocklist as analyze-keywords.mjs, slightly compressed) ────
const BLOCK = [
  /\b(hgh|tren|trenbolone|steroid|sarm|sarms|rad ?140|cialis|finasteride|enclomiphene|chemyo|receptor.?chem|peptide|peptides|melanotan|monobenzone|aqualyx|dnp)\b/,
  /\b(nordid|atlantid|cromagnid|brunn|brünn|dalofaelid|keltic|phenotype|jbw|castizo|indo nordic|hallstatt|wasian|slavic white|race|races|racial|ethnicity|jewish|asian.*chad|black girls|white pilled|whitepill|skin tone|skin color|skin whiten)\b/,
  /\b(rope ?max|ropemax|suicide|kill.*self|burned.*alive|cartel|gore|flaying)\b/,
  /\b(clavicular|salludon|wheat waffles|ehren|astrosky|amnesia|pneumo|dr3amlicid|knajjd|bassandroxk|syrian psycho|jessie|james sapphire|gerbert johnson|rehab room|legoman|st blackops|edvin balyans|maddie kowalski|ice spice|negin|tiara brianna|jason luv|monique brown|ana de armas|adriana lima|alexa demie|sydney sweeney|gal gadot|barbara palvin|yael shelbia|doutzen kroes|mia goth|madison beer|jinnytty|eva elfie|eva cudmore|cocoxcohen|leonarda jonie|shana cohen|bonnie blue|greta thunberg)\b/,
  /\b(jordan barrett|alain delon|marlon brando|david gandy|sean o'?pry|henry cavill|chris evans|jensen ackles|robert pattinson|johnny depp|timothée chalamet|timothee chalamet|brad pitt|ian somerhalder|chace crawford|tristan tate|andrew tate|tom welling|matt bomer|francisco lachowski|hernan drago|lorenzo zurzolo|alfredo|kumail nanjiani|frank tufano|david laid|zyzz|joey swoll|joe fazer|jeff seid|aaron marino|jeremy fragrance|jon zherka|zherka|jon skywalker|dean withers|gypsy crusader|elliot rodger|richard ramirez|patrick bateman|jeremy meeks|luigi mangione|haruma miura|charles leclerc|miguel o.?hara|pierre boo|liam payne|zayn malik|jared leto|al pacino|chris hemsworth|ben shapiro|ezra miller|ash kash|hasan piker|vinnie hacker|duke dennis|tate|salludon|cameron alborzian|gio scotti|alex schlab|isaac moreno|kilian isaak|sigismund|sahib faber|broderick hunter|kyle kuznik|brando erba|mason thames|moritz hau|elias depoot|elias de poot|frederic bittner|max henhappel|max henappel|ethan muth|king68|jarion davidson|sam dezz|sam zia|kai cunningham|edgar|ludi lin|leif stacey|bimboubermensch|king68thegreat|jynxzi|tyler maher|coolcicada|edvin|wentworth miller|chad chad|nocturnal kent|chang triad|alexander zanoza|andreas eriksen|archie cranch|rommulas|romulus|hullo|zillakami|laurence coke|sulumbek|mike thurston|soosh|ilia topuria|soltego|true adam|nocturnal|orb mega|bass|knajjd|salludon|androgenic|pierre|jbs|negin ghalavand|negin vand|jfk|kelly oubre|brando|marlon|aleksa|zanoza|lazer dim|gandy|salludon|dean|towel pulling|opry)\b/,
  /\b(wing zone|maewing|ark ascended|unitedhealthcare|champagne piracy|onlyfans|girlsdoporn|piracy wiki|target self checkout|4chan|reddit|discord server|tiktok poll|tiktoker|youtuber|dnrd|six gorillion|forwardsfromklandma|erome|obo surgery|how to post|car accident|mug shot|mugshot|incel meaning in hindi|are humans devolving|sanasa|champagne|astrosky|fap|nofap|nut|coomer|gooner|gooning|edge max|edgemax|larping|ban evasion|water filter for estrogen|champagne piracy)\b/,
  /\b(diy invisalign|how to bonesmash|coomer|gooner|gooning|nofap|fapping|larp|larping)\b/,
  /\b(blacked|board|forum drama|net worth|height fraud|height frauding|girlfriend|boyfriend|wife|husband|how old is|how tall is|how much does|when did .* peak|with hair|without makeup|without hair|prom photo|reveal|leaked|hospitalized|crash|bp scale|bp slang|bp tiktok|bp meaning|grey meaning bp|what does bp mean|what is bp tiktok|what is bp|target self check)\b/,
];
const ALLOW = [
  /^(face rating|psl|mewing|hunter eyes|canthal tilt|jawline|attractiveness|looksmax|maxilla|cheekbones|side profile|mogging|chad|chadlite|stacy|becky|normie|sub ?[35]|ltn|htn|mtn|htb|ltb|mtb|smv|jfl|khhv|nt|orb|fwhr|ipd|esr|pfl|gigachad|giga chad|jbw)/,
];
function isBlocked(kw) {
  for (const a of ALLOW) if (a.test(kw)) {
    if (/\b(hgh|steroid|tren|sarm|peptide|phenotype|jewish|cartel|rope.?max|suicide|gore)\b/.test(kw)) return true;
    return false;
  }
  return BLOCK.some(p => p.test(kw));
}

// ─── Cluster definitions (same as analyze-keywords.mjs, with phase added) ────
const CLUSTERS = [
  // ─── PHASE 1: Pillars + Tools + Core Glossary ───
  // Tools (highest conversion)
  { name: 'psl-score-calculator', slug: 'psl-score-calculator', type: 'tool', phase: 1,
    test: /\b(psl scale|psl rating|psl chart|psl rater|psl score|psl looks|psl meaning|psl 4|psl stand|what is psl|wtf is psl|complete guide to psl|psl looksmax|psl face rating|psl rating test|what does psl|psl women|psl woman|female psl|psl tier|psl beam|psl post)\b/ },
  { name: 'face-rating-ai', slug: 'ai-face-rating', type: 'tool', phase: 1,
    test: /\b(face rating|face ratings|rate.*face|rating.*face|attractiveness test|attractiveness scale|chatgpt attractiveness|chatgpt looksmax|looksmax gpt|free looksmax ai|ai looksmax|ai looksmaxxing|psl rater|psl scale ai|attractiveness test ai|attractiveness test app|attractiveness test online|attractiveness test photo|attractiveness test picture|looksmax rate|looksmax ai|looksmax report|looksmax face|looks maxxer|5 scale rating|7\.5 out of 10|beauty scale)\b/ },
  { name: 'face-shape-detector', slug: 'face-shape-detector', type: 'tool', phase: 1,
    test: /\b(face shape|oval.*face|diamond.*face|square.*face|heart.*face|round.*face|most attractive face shape)\b/ },
  { name: 'canthal-tilt-checker', slug: 'canthal-tilt-checker', type: 'tool', phase: 1,
    test: /\b(canthal tilt|positive canthal|negative canthal|canthal tilt looksmax|fix canthal|canthal tilt eyes|positive vs negative|negative vs positive|tilt eye|orbital vector)\b/ },
  { name: 'jawline-analyzer', slug: 'jawline-analyzer', type: 'tool', phase: 1,
    test: /\b(jawline|jaw shape|jaw shapes|chad jaw|gonial angle|measure gonial|measure fwhr|fwhr|harmony score|harmony calculator|face ratio calculator|mog face|how to mog)\b/ },
  { name: 'mewing-progress-tracker', slug: 'mewing-tracker', type: 'tool', phase: 1,
    test: /\b(mewing tracker|mewing app|mewing progress|track mewing|mewing results|mewing transformation|mewing photo)\b/ },

  // Pillar Blogs
  { name: 'looksmaxxing-pillar', slug: 'what-is-looksmaxxing', type: 'blog', phase: 1,
    test: /^(looksmax|looksmaxx|looksmaxxing|looksmaxing|looksmaxer|how to looksmax|looksmax meme|looksmax forum|looksmax org|org looksmaxxing|looks ?maxx?er)$/ },
  { name: 'psl-pillar', slug: 'psl-scale-explained', type: 'blog', phase: 1,
    test: /^(psl|what psl|psl ratings|psl 4|psl 5|psl 6|psl 7|psl post size|psl beam size|psl meaning|psl slang)$/ },
  { name: 'mewing-complete-guide', slug: 'mewing-complete-guide', type: 'blog', phase: 1,
    test: /\b(mewing|mewing meaning|mewing definition|mewing tutorial|mewing exercises|mewing benefits|mewing posture|mewing tongue|mewing teeth|mewing jaw|mewing chad|mewing face|mewing trend|mewing meme|mewing device|mewing tool|mewing before|mewing transformation)\b/ },
  { name: 'hunter-eyes-guide', slug: 'hunter-eyes-guide', type: 'blog', phase: 1,
    test: /\b(hunter eyes|prey eyes|almond eyes|hunter eye surgery|how to.*hunter eyes|deep set eyes|small eyes men|negative hooding|upper eyelid exposure|orb oculi|hooded eyes)\b/ },
  { name: 'maxilla-guide', slug: 'maxilla-guide', type: 'blog', phase: 1,
    test: /\b(maxilla|recessed maxilla|flat maxilla|forward maxilla|projected maxilla|good maxilla|bad maxilla|upper maxilla|lower maxilla|fix.*maxilla|maxilla recessed|recessed midface|midface|forward growth|downward growth|grow maxilla)\b/ },
  { name: 'jawline-improvement-guide', slug: 'jawline-improvement-guide', type: 'blog', phase: 1,
    test: /\b(jaw improvement|jawline improvement|jawline development|sharp jawline|sharpen.*jaw|jawmax|jawmaxxing|jaw maxxing|jaw filler|chin filler|chin filler migrate|jawline enhancer|jaw stop growing|mogging meaning|jutting jaw|jaw exercise|chin sticks out)\b/ },
  { name: 'cheekbones-guide', slug: 'cheekbones-guide', type: 'blog', phase: 1,
    test: /\b(cheekbones|cheek bones|malar bones|zygos|zygo|zygo pull|zygomatic|bizygomatic|hollow cheeks|high cheekbones|low cheekbones|recessed cheekbones|recessed zygos|medium set cheekbones|high set vs low|skull crusher)\b/ },
  { name: 'bonesmashing-truth', slug: 'bonesmashing-truth', type: 'blog', phase: 1,
    test: /\b(bone ?smash|bonesmash|does bonesmashing|bonesmashing guide|bonesmashing results)\b/ },
  { name: 'beard-growth-guide', slug: 'beard-growth-guide', type: 'blog', phase: 1,
    test: /\b(beard|minoxidil for beard|grow.*beard|beard growth|facial hair|beard with minoxidil|disconnected beard|beard mustache|stubble|clean shav)\b/ },
  { name: 'eyebrow-maxxing', slug: 'eyebrow-maxxing-guide', type: 'blog', phase: 1,
    test: /\b(eyebrow|eyebrows|brows|eyebrow dye|dye eyebrows|dyeing eyebrows|thicken eyebrows|ideal eyebrows|optimal eyebrow|low set eyebrow|lower eyebrows|arched eyebrow|asymmetrical eyebrow|fix.*eyebrow|positive tilt eyebrow|tilted brow|eyebrow ratio|distance between eyebrows|how far apart should eyebrows)\b/ },
  { name: 'eyelash-growth', slug: 'eyelash-growth-guide', type: 'blog', phase: 1,
    test: /\b(eyelash|eyelashes|lashes|minoxidil.*eyelash|dye.*eyelash|curl.*eyelash|eyelash curler|latisse|orbital fat loss|vaseline.*lash)\b/ },
  { name: 'haircut-styles-face-shape', slug: 'haircut-for-face-shape', type: 'blog', phase: 1,
    test: /\b(haircut|hairstyle|hair style|zyzz hair|hair guide)\b/ },
  { name: 'teeth-smile-guide', slug: 'teeth-smile-guide', type: 'blog', phase: 1,
    test: /\b(teeth smile|tooth smile|6 teeth|8 tooth|10 teeth|12 teeth|smile tooth|narrow palate|wide palate|palate width|sharp.*canine|canine teeth|sharpening canine|6 tooth smile|invisalign|braces)\b/ },
  { name: 'face-symmetry-harmony', slug: 'facial-harmony-guide', type: 'blog', phase: 1,
    test: /\b(facial symmetry|asymmetry|facial harmony|facial convexity|side profile|chin to philtrum|philtrum length|ideal philtrum|chin philtrum|midface ratio|fwhr|ipd|interpupillary|esr|eye separation|eye spacing|ideal ipd|nose ratio|ideal nose|male nose|chad side profile|perfect side profile|ideal eye)\b/ },
  { name: 'mens-skincare-routine', slug: 'mens-skincare-routine', type: 'blog', phase: 1,
    test: /\b(skincare|skin routine|kojic|accutane before|hyperpigmentation|under ?eye|eye area skincare|nasolabial|mentolabial|itachi lines|dark circle)\b/ },
  { name: 'mens-grooming-essentials', slug: 'mens-grooming-essentials', type: 'blog', phase: 1,
    test: /\b(cologne|fragrance|scent ?max|pheromone|kohl eyeliner|mascara men|men.*makeup|softmax|hardmax|softmaxx|hardmaxx|soft maxing|hard maxxing)\b/ },
  { name: 'height-frame-guide', slug: 'height-and-frame-guide', type: 'blog', phase: 1,
    test: /\b(height|heightmax|heightmaxxing|height mog|tall|manlet|dwarf|frame mog|narrow clavicle|wide clavicle|clavicle width|narrow.*clavicle|frame|broad shoulders|how to get wider|inversion table|clavicle stop growing|when do clavicles)\b/ },
  { name: 'body-fat-face', slug: 'body-fat-and-face', type: 'blog', phase: 1,
    test: /\b(body fat.*face|face fat|debloat|bloat|debloating|body fat percentage|abs visible|potassium maxx|carrot max)\b/ },
  { name: 'masseter-training', slug: 'masseter-training-guide', type: 'blog', phase: 1,
    test: /\b(masseter|mastic gum|incisor chewing)\b/ },
  { name: 'forward-growth-mewing', slug: 'forward-growth-explained', type: 'blog', phase: 1,
    test: /\b(forward growth|forward grown|hyoid|raise hyoid|hyoid bone|hyoid exercise|tongue posture|palate expansion)\b/ },
  { name: 'looksmaxxing-women', slug: 'looksmaxxing-for-women', type: 'blog', phase: 1,
    test: /\b(looksmax women|looksmax(?:ing|xing)? women|looksmax(?:ing|xing)? woman|female looksmax|looksmaxxing female|psl scale woman|psl scale women|attractiveness scale female|stacy looksmax)\b/ },
  { name: 'looksmaxxing-guide', slug: 'looksmaxxing-tips-and-checklist', type: 'blog', phase: 1,
    test: /\b(looksmax(?:ing|xing)? guide|complete looksmax|how to looksmax|looksmax tips|looksmaxxing tips|looksmaxxing checklist|looksmaxxing chart|looksmax chart|looksmax(?:ing|xing)? tier|looksmaxxing ranks|looksmaxxing rating|looksmax(?:ing|xing)? scale|looksmax website|looksmaxxing\.com|looksmaxxing for men|looksmaxxing men|looksmaxing men|looksmax(?:ing|xing)? before|looksmax(?:ing|xing)? transformation|looksmax(?:ing|xing)? products|looksmax kit|looksmax filter|how to looksmaxx|how to ascend)\b/ },
  { name: 'facial-aesthetics-pillar', slug: 'facial-aesthetics', type: 'blog', phase: 1,
    test: /\b(facial aesthetics|face forward aesthetics|face first aesthetics|mov aesthetics|facial aesthetics concepts|aesthetic|aesthetics)\b/ },
  { name: 'before-after-transformations', slug: 'looksmaxxing-transformations', type: 'blog', phase: 1,
    test: /\b(before and after|before & after|before after|transformation pic|transformation photo)\b/ },

  // Glossary (Phase 1)
  { name: 'gloss-htn', slug: 'htn', type: 'glossary', phase: 1, test: /\b(htn|what is htn|htn meaning|htn face|htn looksmax|htn slang|htn chart)\b/ },
  { name: 'gloss-ltn', slug: 'ltn', type: 'glossary', phase: 1, test: /\b(ltn|what is ltn|ltn meaning|ltn face|ltn looksmax|ltn slang|ltn chart|ltn scale)\b/ },
  { name: 'gloss-mtn', slug: 'mtn', type: 'glossary', phase: 1, test: /\b(mtn|what is mtn|mtn meaning|mtn looksmax|mtn slang|mtn vs htn|mtn medical)\b/ },
  { name: 'gloss-htb-ltb-mtb', slug: 'htb-ltb-mtb', type: 'glossary', phase: 1, test: /\b(htb|ltb|mtb|htb meaning|ltb meaning|mtb meaning|ltb mtb htb)\b/ },
  { name: 'gloss-jbw', slug: 'jbw', type: 'glossary', phase: 1, test: /\b(jbw|jbw theory|jbw meaning|definition of jbw)\b/ },
  { name: 'gloss-smv', slug: 'smv', type: 'glossary', phase: 1, test: /\b(smv|what does smv mean|smv meaning|smv chad)\b/ },
  { name: 'gloss-jfl', slug: 'jfl', type: 'glossary', phase: 1, test: /\b(jfl|what does jfl|jfl meaning|jfl looksmax)\b/ },
  { name: 'gloss-khhv', slug: 'khhv', type: 'glossary', phase: 1, test: /\b(khhv|what does khhv|what is khhv)\b/ },
  { name: 'gloss-foid', slug: 'foid', type: 'glossary', phase: 1, test: /\b(foid|foid meaning|hypergamous foid)\b/ },
  { name: 'gloss-dbdr', slug: 'dbdr', type: 'glossary', phase: 1, test: /\b(dbdr|dbdr face|dbdr meaning|dbdr reddit)\b/ },
  { name: 'gloss-mogging', slug: 'mogging', type: 'glossary', phase: 1, test: /\b(mogging|mog meaning|mogger|height mog|frame mog|mogging meaning)\b/ },
  { name: 'gloss-chad', slug: 'chad', type: 'glossary', phase: 1, test: /\b(\bchad\b|chad meaning|gigachad|giga chad|mexican chad)\b/ },
  { name: 'gloss-chadlite', slug: 'chadlite', type: 'glossary', phase: 1, test: /\b(chadlite|chad lite|chadlite meaning|chadlite face|chadlite chart|what is a chadlite)\b/ },
  { name: 'gloss-stacy', slug: 'stacy-and-becky', type: 'glossary', phase: 1, test: /\b(stacy|stacy meaning|stacylite|stacy looksmax|true stacy|high tier becky|low tier becky|mid tier becky|becky)\b/ },
  { name: 'gloss-normie', slug: 'normie', type: 'glossary', phase: 1, test: /\b(normie|low tier normie|mid tier normie|normie meaning|high tier normie)\b/ },
  { name: 'gloss-truecel-fakecel', slug: 'truecel-fakecel-greycel', type: 'glossary', phase: 1, test: /\b(truecel|fakecel|greycel|grey ?cel|wristcel|mentalcel|iqcel|iqlet|baraka)\b/ },
  { name: 'gloss-sub5-sub3', slug: 'sub5-sub3', type: 'glossary', phase: 1, test: /\b(sub ?5|sub ?3|sub5 face|sub5 male|sub5 human|sub 5 looksmax|what is a sub5)\b/ },
  { name: 'gloss-softmax-hardmax', slug: 'softmaxxing-vs-hardmaxxing', type: 'glossary', phase: 1, test: /\b(softmax|softmaxxing|hardmax|hardmaxxing|soft max|hard max|what is softmax)\b/ },
  { name: 'gloss-jestermaxxing', slug: 'jestermaxxing', type: 'glossary', phase: 1, test: /\b(jestermax|jester max|jestermaxxing)\b/ },
  { name: 'gloss-goyslop', slug: 'goyslop', type: 'glossary', phase: 1, test: /\b(goyslop|goy slop)\b/ },
  { name: 'gloss-caging', slug: 'caging', type: 'glossary', phase: 1, test: /\b(caging|caging meaning|cage slang|cage looksmax)\b/ },
  { name: 'gloss-heightmaxxing', slug: 'heightmaxxing', type: 'glossary', phase: 1, test: /\b(heightmax|height max|heightpill|dwarfmax)\b/ },
  { name: 'gloss-iqmaxxing-brainmaxxing', slug: 'iqmaxxing-brainmaxxing', type: 'glossary', phase: 1, test: /\b(iqmax|iq max|brainmax|brain max|lifemax|life max)\b/ },
  { name: 'gloss-orbital', slug: 'orbital-bones-recessed', type: 'glossary', phase: 1, test: /\b(orb meaning|orb looksmax|recessed orbitals|recessed infraorbitals|recessed infras|infraorbital)\b/ },
  { name: 'gloss-fwhr-ipd-esr', slug: 'fwhr-ipd-esr', type: 'glossary', phase: 1, test: /\b(fwhr looksmax|ipd looksmax|esr looksmax|pfl looksmax|fwhr meaning|ipd meaning|what is fwhr|what is ipd)\b/ },
  { name: 'gloss-oofy-doofy', slug: 'oofy-doofy', type: 'glossary', phase: 1, test: /\b(oofy doofy|oofy doofy meaning)\b/ },
  { name: 'gloss-misc-slang', slug: 'looksmaxxing-slang-glossary', type: 'glossary', phase: 1, test: /\b(nt slang|what does nt|black ?pill|blackpill scale|blackpill tier|blackpill rating|appeal vs psl|cope|hagmax|hagmaxxing|cologne max|fraudmax|fraudmaxxing|halo|halo effect|looksmaxxing slang)\b/ },
];

// ─── PHASE 2: Long-tail expansion (manual entries) ───────────────────────────
// These are pages that don't map cleanly to keyword data but cover known intent
const PHASE_2_PAGES = [
  // Comparisons (~25 pages)
  { slug: 'positive-vs-negative-canthal-tilt', type: 'blog', primary: 'positive vs negative canthal tilt', volume: 880, cluster: 'compare-canthal-tilt', phase: 2 },
  { slug: 'hunter-eyes-vs-prey-eyes', type: 'blog', primary: 'hunter eyes vs prey eyes', volume: 590, cluster: 'compare-eyes', phase: 2 },
  { slug: 'hunter-eyes-vs-almond-eyes', type: 'blog', primary: 'hunter eyes vs almond eyes', volume: 480, cluster: 'compare-eyes', phase: 2 },
  { slug: 'flat-vs-recessed-maxilla', type: 'blog', primary: 'flat vs recessed maxilla', volume: 720, cluster: 'compare-maxilla', phase: 2 },
  { slug: 'recessed-vs-normal-maxilla', type: 'blog', primary: 'recessed vs normal maxilla', volume: 590, cluster: 'compare-maxilla', phase: 2 },
  { slug: 'good-vs-bad-maxilla', type: 'blog', primary: 'good vs bad maxilla', volume: 480, cluster: 'compare-maxilla', phase: 2 },
  { slug: 'high-vs-low-cheekbones', type: 'blog', primary: 'high vs low cheekbones', volume: 320, cluster: 'compare-cheekbones', phase: 2 },
  { slug: 'short-vs-long-ramus', type: 'blog', primary: 'short vs long ramus', volume: 390, cluster: 'compare-jaw', phase: 2 },
  { slug: 'oval-vs-diamond-face-shape', type: 'blog', primary: 'oval vs diamond face shape', volume: 260, cluster: 'compare-face-shape', phase: 2 },
  { slug: 'mewing-vs-bonesmashing', type: 'blog', primary: 'mewing vs bonesmashing', volume: 200, cluster: 'compare-techniques', phase: 2 },
  { slug: 'softmaxxing-vs-hardmaxxing-explained', type: 'blog', primary: 'softmaxxing vs hardmaxxing', volume: 180, cluster: 'compare-techniques', phase: 2 },
  { slug: 'forward-vs-downward-growth', type: 'blog', primary: 'forward vs downward growth', volume: 320, cluster: 'compare-growth', phase: 2 },
  { slug: 'wide-vs-narrow-palate', type: 'blog', primary: 'wide vs narrow palate', volume: 390, cluster: 'compare-palate', phase: 2 },
  { slug: 'mandible-vs-maxilla', type: 'blog', primary: 'mandible vs maxilla', volume: 1900, cluster: 'compare-bones', phase: 2 },
  { slug: 'y-taper-vs-v-taper', type: 'blog', primary: 'y taper vs v taper', volume: 390, cluster: 'compare-frame', phase: 2 },
  { slug: 'high-vs-low-lat-insertions', type: 'blog', primary: 'high lat insertions vs low', volume: 480, cluster: 'compare-frame', phase: 2 },
  { slug: 'clean-shaven-vs-stubble', type: 'blog', primary: 'clean shaven vs stubble', volume: 320, cluster: 'compare-grooming', phase: 2 },
  { slug: 'mtn-vs-htn', type: 'blog', primary: 'mtn vs htn', volume: 320, cluster: 'compare-tiers', phase: 2 },
  { slug: 'narrow-vs-wide-clavicles', type: 'blog', primary: 'narrow vs wide clavicles', volume: 480, cluster: 'compare-frame', phase: 2 },

  // How-to articles (~25 pages)
  { slug: 'how-to-fix-recessed-maxilla', type: 'blog', primary: 'how to fix recessed maxilla', volume: 480, cluster: 'how-to-maxilla', phase: 2 },
  { slug: 'how-to-fix-negative-canthal-tilt', type: 'blog', primary: 'how to fix negative canthal tilt', volume: 390, cluster: 'how-to-eyes', phase: 2 },
  { slug: 'how-to-get-positive-canthal-tilt', type: 'blog', primary: 'how to get positive canthal tilt', volume: 480, cluster: 'how-to-eyes', phase: 2 },
  { slug: 'how-to-get-rid-of-itachi-lines', type: 'blog', primary: 'how to get rid of itachi lines', volume: 480, cluster: 'how-to-skin', phase: 2 },
  { slug: 'how-to-fix-asymmetrical-eyebrows', type: 'blog', primary: 'how to fix asymmetrical eyebrows', volume: 170, cluster: 'how-to-eyebrows', phase: 2 },
  { slug: 'how-to-grow-maxilla', type: 'blog', primary: 'how to grow maxilla', volume: 260, cluster: 'how-to-maxilla', phase: 2 },
  { slug: 'how-to-thicken-eyebrows-men', type: 'blog', primary: 'how to thicken eyebrows men', volume: 170, cluster: 'how-to-eyebrows', phase: 2 },
  { slug: 'how-to-dye-eyelashes-at-home', type: 'blog', primary: 'how to dye your eyelashes at home', volume: 170, cluster: 'how-to-lashes', phase: 2 },
  { slug: 'how-to-mog-someone', type: 'blog', primary: 'how to mog', volume: 320, cluster: 'how-to-presence', phase: 2 },
  { slug: 'how-to-ascend-looksmaxxing', type: 'blog', primary: 'how to ascend', volume: 260, cluster: 'how-to-presence', phase: 2 },
  { slug: 'how-to-get-clean-shave', type: 'blog', primary: 'how to get a clean shave', volume: 720, cluster: 'how-to-grooming', phase: 2 },
  { slug: 'how-to-shave-without-cream', type: 'blog', primary: 'shave without shaving cream', volume: 720, cluster: 'how-to-grooming', phase: 2 },
  { slug: 'how-to-raise-hyoid-bone', type: 'blog', primary: 'how to raise hyoid bone', volume: 590, cluster: 'how-to-mewing', phase: 2 },
  { slug: 'how-to-get-forward-growth', type: 'blog', primary: 'how to get forward growth', volume: 320, cluster: 'how-to-mewing', phase: 2 },
  { slug: 'how-to-get-low-set-eyebrows', type: 'blog', primary: 'how to get low set eyebrows', volume: 260, cluster: 'how-to-eyebrows', phase: 2 },
  { slug: 'how-to-get-longer-ramus', type: 'blog', primary: 'how to get a longer ramus', volume: 140, cluster: 'how-to-jaw', phase: 2 },
  { slug: 'how-to-grow-masseter-muscle', type: 'blog', primary: 'how to grow masseter muscle', volume: 210, cluster: 'how-to-jaw', phase: 2 },
  { slug: 'how-to-tell-if-maxilla-is-recessed', type: 'blog', primary: 'how to tell if maxilla is recessed', volume: 320, cluster: 'how-to-diagnose', phase: 2 },
  { slug: 'how-to-tell-if-clavicles-narrow', type: 'blog', primary: 'how to tell if you have narrow clavicles', volume: 480, cluster: 'how-to-diagnose', phase: 2 },
  { slug: 'how-to-measure-fwhr', type: 'blog', primary: 'how to measure fwhr', volume: 140, cluster: 'how-to-measure', phase: 2 },
  { slug: 'how-to-measure-gonial-angle', type: 'blog', primary: 'how to measure gonial angle', volume: 140, cluster: 'how-to-measure', phase: 2 },

  // "Is X attractive" / "Why X" listicles (~12 pages)
  { slug: 'are-deep-set-eyes-attractive', type: 'blog', primary: 'are deep set eyes attractive', volume: 480, cluster: 'why-attractive', phase: 2 },
  { slug: 'are-overbites-attractive', type: 'blog', primary: 'attractive slight overbite', volume: 170, cluster: 'why-attractive', phase: 2 },
  { slug: 'why-big-noses-are-unattractive', type: 'blog', primary: 'big nose unattractive', volume: 320, cluster: 'why-attractive', phase: 2 },
  { slug: 'why-small-eyes-are-attractive', type: 'blog', primary: 'small eyes men', volume: 260, cluster: 'why-attractive', phase: 2 },
  { slug: 'are-thin-lips-attractive-men', type: 'blog', primary: 'thin lips men', volume: 320, cluster: 'why-attractive', phase: 2 },
  { slug: 'are-hooded-eyes-attractive', type: 'blog', primary: 'hooded eyes attractive', volume: 200, cluster: 'why-attractive', phase: 2 },
  { slug: 'most-attractive-face-shape-men', type: 'blog', primary: 'most attractive face shape men', volume: 170, cluster: 'why-attractive', phase: 2 },
  { slug: 'masculine-face-shape', type: 'blog', primary: 'masculine face shape', volume: 14800, cluster: 'why-attractive', phase: 2 },
  { slug: 'hyper-masculine-face', type: 'blog', primary: 'hyper masculine face', volume: 210, cluster: 'why-attractive', phase: 2 },

  // Anatomy deep-dives (~15 pages)
  { slug: 'bigonial-width', type: 'blog', primary: 'bigonial width', volume: 720, cluster: 'anatomy', phase: 2 },
  { slug: 'ramus-length', type: 'blog', primary: 'ramus length', volume: 390, cluster: 'anatomy', phase: 2 },
  { slug: 'gonial-angle-explained', type: 'blog', primary: 'gonial angle', volume: 260, cluster: 'anatomy', phase: 2 },
  { slug: 'philtrum-explained', type: 'blog', primary: 'ideal philtrum', volume: 200, cluster: 'anatomy', phase: 2 },
  { slug: 'brow-ridge-importance', type: 'blog', primary: 'brow ridge male', volume: 260, cluster: 'anatomy', phase: 2 },
  { slug: 'medial-canthus', type: 'blog', primary: 'downturned medial canthus', volume: 390, cluster: 'anatomy', phase: 2 },
  { slug: 'eye-spacing-ipd', type: 'blog', primary: 'eye spacing', volume: 390, cluster: 'anatomy', phase: 2 },
  { slug: 'face-ratio-fwhr', type: 'blog', primary: 'ideal fwhr', volume: 210, cluster: 'anatomy', phase: 2 },
  { slug: 'compact-midface', type: 'blog', primary: 'compact midface', volume: 210, cluster: 'anatomy', phase: 2 },
  { slug: 'forehead-slope', type: 'blog', primary: 'forehead slope', volume: 170, cluster: 'anatomy', phase: 2 },
  { slug: 'inward-flared-gonions', type: 'blog', primary: 'flared gonions', volume: 590, cluster: 'anatomy', phase: 2 },
  { slug: 'sphenoid-torsion', type: 'blog', primary: 'sphenoid torsion', volume: 170, cluster: 'anatomy', phase: 2 },
  { slug: 'recessed-radix', type: 'blog', primary: 'recessed radix', volume: 170, cluster: 'anatomy', phase: 2 },
  { slug: 'bitemporal-width', type: 'blog', primary: 'bitemporal width', volume: 140, cluster: 'anatomy', phase: 2 },

  // Procedure pages (~15 pages)
  { slug: 'jaw-filler-before-after', type: 'blog', primary: 'jaw filler before and after men', volume: 260, cluster: 'procedure', phase: 2 },
  { slug: 'chin-filler-migrate', type: 'blog', primary: 'does chin filler migrate', volume: 390, cluster: 'procedure', phase: 2 },
  { slug: 'bimax-surgery-cost', type: 'blog', primary: 'bimax cost', volume: 210, cluster: 'procedure', phase: 2 },
  { slug: 'bimax-before-after', type: 'blog', primary: 'bimax before and after', volume: 590, cluster: 'procedure', phase: 2 },
  { slug: 'lefort-1-before-after', type: 'blog', primary: 'le fort 1 before and after', volume: 170, cluster: 'procedure', phase: 2 },
  { slug: 'orbital-box-osteotomy', type: 'blog', primary: 'orbital box osteotomy before and after', volume: 320, cluster: 'procedure', phase: 2 },
  { slug: 'supraorbital-rim-implants', type: 'blog', primary: 'supraorbital rim implants', volume: 140, cluster: 'procedure', phase: 2 },
  { slug: 'brow-ridge-implants', type: 'blog', primary: 'brow ridge implants', volume: 320, cluster: 'procedure', phase: 2 },
  { slug: 'midface-shortening-surgery', type: 'blog', primary: 'midface shortening surgery', volume: 170, cluster: 'procedure', phase: 2 },
  { slug: 'volufiline-lips', type: 'blog', primary: 'volufiline lips before and after', volume: 320, cluster: 'procedure', phase: 2 },
  { slug: 'buccal-fat-removal', type: 'blog', primary: 'buccal fat removal gone wrong', volume: 260, cluster: 'procedure', phase: 2 },
  { slug: 'accutane-before-after', type: 'blog', primary: 'before and after accutane pictures', volume: 260, cluster: 'procedure', phase: 2 },
  { slug: 'jaw-implants', type: 'blog', primary: 'jaw implants', volume: 200, cluster: 'procedure', phase: 2 },
  { slug: 'minoxidil-eyebrows', type: 'blog', primary: 'minoxidil eyebrows before and after', volume: 1600, cluster: 'procedure', phase: 2 },
  { slug: 'minoxidil-eyelashes', type: 'blog', primary: 'minoxidil on eyelashes', volume: 1000, cluster: 'procedure', phase: 2 },
];

// ─── PHASE 3: Programmatic patterns ───────────────────────────────────────────
// Face-shape × Hair/Beard/Glasses pattern (most pSEO-style)
const FACE_SHAPES = ['oval', 'round', 'square', 'heart', 'diamond', 'oblong', 'triangle'];
const PHASE_3_PAGES = [];

// 7 face shapes × 3 styling categories × 1 (men focus, women later) = 21 pages
for (const shape of FACE_SHAPES) {
  PHASE_3_PAGES.push({
    slug: `best-haircut-for-${shape}-face-men`, type: 'blog',
    primary: `best haircut for ${shape} face men`, volume: 800, cluster: `haircut-${shape}`, phase: 3,
  });
  PHASE_3_PAGES.push({
    slug: `best-beard-for-${shape}-face`, type: 'blog',
    primary: `best beard style for ${shape} face`, volume: 400, cluster: `beard-${shape}`, phase: 3,
  });
  PHASE_3_PAGES.push({
    slug: `best-glasses-for-${shape}-face`, type: 'blog',
    primary: `best glasses for ${shape} face shape`, volume: 600, cluster: `glasses-${shape}`, phase: 3,
  });
}

// Listicles (~10 pages)
const LISTICLES = [
  { slug: '7-face-shapes-explained', primary: '7 face shapes', volume: 320 },
  { slug: '10-mewing-exercises', primary: '10 mewing exercises', volume: 280 },
  { slug: '8-jawline-exercises', primary: 'best jawline exercises', volume: 1300 },
  { slug: '5-hunter-eyes-tips', primary: 'how to get hunter eyes', volume: 720 },
  { slug: '7-skincare-mistakes-men', primary: 'mens skincare mistakes', volume: 200 },
  { slug: '10-looksmaxxing-foods', primary: 'best foods for looksmaxxing', volume: 150 },
  { slug: '5-eyebrow-shapes-men', primary: 'best eyebrow shapes for men', volume: 200 },
  { slug: '6-haircuts-for-receding-hairline', primary: 'haircuts for receding hairline', volume: 1900 },
  { slug: '10-dental-features-attractive', primary: 'most attractive teeth', volume: 200 },
  { slug: '7-style-tips-shorter-men', primary: 'style tips for shorter men', volume: 200 },
];
for (const l of LISTICLES) PHASE_3_PAGES.push({ ...l, type: 'blog', cluster: 'listicle', phase: 3 });

// More tools (Phase 3)
const PHASE_3_TOOLS = [
  { slug: 'haircut-recommendation-tool', type: 'tool', primary: 'haircut for face shape ai', volume: 800, cluster: 'tool-haircut', phase: 3 },
  { slug: 'beard-style-finder', type: 'tool', primary: 'beard style finder', volume: 300, cluster: 'tool-beard', phase: 3 },
  { slug: 'mewing-form-checker', type: 'tool', primary: 'mewing form checker', volume: 200, cluster: 'tool-mewing', phase: 3 },
  { slug: 'symmetry-analyzer', type: 'tool', primary: 'face symmetry analyzer', volume: 1300, cluster: 'tool-symmetry', phase: 3 },
];

// More glossary (Phase 3)
const PHASE_3_GLOSSARY = [
  { slug: 'pheromone-maxxing', primary: 'pheromone maxxing', volume: 390, cluster: 'gloss-pheromone' },
  { slug: 'frame-maxxing', primary: 'frame mogger', volume: 170, cluster: 'gloss-frame' },
  { slug: 'geomaxxing', primary: 'geomaxxing', volume: 320, cluster: 'gloss-geomax' },
  { slug: 'bloatmaxxing', primary: 'bloatmaxxing', volume: 210, cluster: 'gloss-bloatmax' },
  { slug: 'edgemaxxing', primary: 'edgemaxxing', volume: 210, cluster: 'gloss-edgemax' },
  { slug: 'fraudmaxxing', primary: 'fraudmaxxing', volume: 200, cluster: 'gloss-fraudmax' },
  { slug: 'failos', primary: 'failos', volume: 390, cluster: 'gloss-failos' },
  { slug: 'iqlet', primary: 'iqlet', volume: 480, cluster: 'gloss-iqlet' },
  { slug: 'beta-bux', primary: 'betabux', volume: 390, cluster: 'gloss-betabux' },
  { slug: 'manlet', primary: 'manlet definition', volume: 390, cluster: 'gloss-manlet' },
  { slug: 'rate-tier-list', primary: 'looksmaxxing tier list', volume: 320, cluster: 'gloss-tier-list' },
  { slug: 'halo-effect', primary: 'halo effect looksmax', volume: 200, cluster: 'gloss-halo' },
  { slug: 'roastie', primary: 'roastie meaning', volume: 200, cluster: 'gloss-roastie' },
  { slug: 'oneitis', primary: 'oneitis meaning', volume: 800, cluster: 'gloss-oneitis' },
  { slug: 'incel', primary: 'what is incel', volume: 5400, cluster: 'gloss-incel' },
  { slug: 'volcel', primary: 'volcel meaning', volume: 600, cluster: 'gloss-volcel' },
];
for (const g of PHASE_3_GLOSSARY) PHASE_3_PAGES.push({ ...g, type: 'glossary', phase: 3 });
for (const t of PHASE_3_TOOLS) PHASE_3_PAGES.push(t);

// ─── MAIN ───────────────────────────────────────────────────────────────────

const list1 = loadCsv(F1, 2, 1, 5);
const list2 = loadCsv(F2, 2, 1, 5);

// Merge & dedupe
const merged = new Map();
for (const x of [...list1, ...list2]) {
  const cur = merged.get(x.keyword);
  if (!cur || x.volume > cur.volume) merged.set(x.keyword, x);
}
const all = [...merged.values()];
console.log(`📊 Total unique kw: ${all.length}`);

const filtered = all.filter(x => !isBlocked(x.keyword));
console.log(`✅ After filter: ${filtered.length}`);

// Assign each keyword to first matching cluster, mark primary by highest volume
const buckets = new Map();
for (const c of CLUSTERS) buckets.set(c.name, { ...c, keywords: [] });

for (const item of filtered) {
  for (const c of CLUSTERS) {
    if (c.test.test(item.keyword)) {
      buckets.get(c.name).keywords.push({ keyword: item.keyword, volume: item.volume, sd: item.sd });
      break;
    }
  }
}

// ─── Build CSV rows ──────────────────────────────────────────────────────────
const rows = [];
for (const b of buckets.values()) {
  if (!b.keywords.length) {
    // Empty cluster — still create one stub row so it's generatable
    rows.push({
      keyword: b.name.replace(/^gloss-/, '').replace(/-/g, ' '),
      volume: 100, sd: 30, cluster: b.name, slug: b.slug,
      status: 'pending', page_type: b.type, primary: 'yes', phase: b.phase,
    });
    continue;
  }
  // Sort by volume desc, mark first as primary
  b.keywords.sort((a, z) => z.volume - a.volume);
  b.keywords.forEach((kw, i) => {
    rows.push({
      keyword: kw.keyword, volume: kw.volume, sd: kw.sd,
      cluster: b.name, slug: b.slug,
      status: 'pending', page_type: b.type,
      primary: i === 0 ? 'yes' : 'no',
      phase: b.phase,
    });
  });
}

// Add Phase 2 + 3 pages (one row each, marked primary=yes)
for (const p of [...PHASE_2_PAGES, ...PHASE_3_PAGES]) {
  rows.push({
    keyword: p.primary, volume: p.volume, sd: 30,
    cluster: p.cluster, slug: p.slug,
    status: 'pending', page_type: p.type,
    primary: 'yes', phase: p.phase,
  });
}

// ─── Write CSV ───────────────────────────────────────────────────────────────
fs.mkdirSync(path.dirname(OUT), { recursive: true });
const headers = ['keyword', 'volume', 'sd', 'cluster', 'slug', 'status', 'page_type', 'primary', 'phase'];
const csv = [
  headers.join(','),
  ...rows.map(r => headers.map(h => {
    const v = String(r[h] ?? '');
    return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
  }).join(',')),
].join('\n') + '\n';
fs.writeFileSync(OUT, csv);

// ─── Report ──────────────────────────────────────────────────────────────────
const uniqueSlugs = new Set(rows.map(r => r.slug));
const byPhase = { 1: 0, 2: 0, 3: 0 };
const byTypePhase = {};
for (const r of rows) {
  if (r.primary !== 'yes') continue;
  byPhase[r.phase] = (byPhase[r.phase] || 0) + 1;
  const k = `${r.page_type}/p${r.phase}`;
  byTypePhase[k] = (byTypePhase[k] || 0) + 1;
}

console.log(`\n✅ Wrote ${OUT}`);
console.log(`   Total rows:    ${rows.length}`);
console.log(`   Unique pages:  ${uniqueSlugs.size}`);
console.log(`\n📊 Pages by phase:`);
console.log(`   Phase 1 (foundation):       ${byPhase[1]}`);
console.log(`   Phase 2 (long-tail):        ${byPhase[2]}`);
console.log(`   Phase 3 (programmatic):     ${byPhase[3]}`);
console.log(`\n📊 By type/phase:`);
for (const [k, v] of Object.entries(byTypePhase).sort()) {
  console.log(`   ${k.padEnd(15)} ${v}`);
}
