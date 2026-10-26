import { test } from 'node:test';
import assert from 'node:assert/strict';
import { imageInput, IMAGE_MODEL, validateContent, needsHumanReview, productBrief, extractSources, reviewImage, reviewPage, isDeterministicIssue, DETERMINISTIC_ISSUES, rebriefImages } from '../scripts/content-quality.mjs';
import { relevantTool, toolCatalog } from '../config/tool-routing.mjs';
import remarkToolLinks from '../scripts/remark-tool-links.mjs';
const page = { slug:'hairstyles-for-women', primary_keyword:'hairstyles for women', page_type:'blog' };
const sources = [{title:'A primary source',url:'https://example.org/research/1'},{title:'Another primary source',url:'https://example.org/research/2'}];
test('legacy article links point to the relevant upload while specific links stay unchanged', () => {
  const tree = { children: [{type:'link',url:'https://app.aura-looksmaxxing.com/'},{type:'link',url:'https://app.aura-looksmaxxing.com/tools/symmetry-analyzer'}] };
  remarkToolLinks()(tree,{data:{astro:{frontmatter:{slug:'looksmaxxing-for-women',title:'Female looksmaxxing'}}}});
  assert.match(tree.children[0].url,/tools\/face-analysis-for-women/);
  assert.equal(tree.children[1].url,'https://app.aura-looksmaxxing.com/tools/symmetry-analyzer');
});
const article = () => ({
  title:'Hairstyles for women',description:'A practical guide',sources,
  body_markdown: '## Useful ideas\n\n' + 'Useful specific styling advice. '.repeat(200) + '\n{{IMAGE_2}}\n[Explore your haircut options](' + productBrief(page).url + ')\n{{IMAGE_3}}',
  image_prompts:[1,2,3].map(i=>({prompt:'A detailed concrete styling demonstration with different framing and specific visible details '+i,alt:'Visible styling example '+i,purpose:'Show the framing idea in section '+i})),
});
test('image provider and low-quality square settings are exact',()=>{
  const input=imageInput('A relevant visual');
  assert.equal(IMAGE_MODEL,'openai/gpt-image-2.5/flare/text-to-image');
  assert.deepEqual(input.image_size,{width:1024,height:1024});assert.equal(input.quality,'low');assert.equal(input.num_images,1);
});
test('women, haircut, planner and body topics route according to intent',()=>{
  assert.equal(relevantTool('Female looksmaxxing').slug,'face-analysis-for-women');
  assert.equal(relevantTool('hairstyles for women').slug,'hairstyle-finder-for-women');
  assert.equal(relevantTool('face shape').slug,'face-shape-detector');
  assert.equal(relevantTool('glow up checklist').slug,'glow-up-planner');
  assert.equal(relevantTool('clavicle width'),null);
  assert.equal(toolCatalog.length,new Set(toolCatalog.map(t=>t.slug)).size);
});
test('a sourced, contextual draft passes structural checks',()=>assert.deepEqual(validateContent(page,article(),sources),[]));
test('made-up sources, glossary errors, missing visuals and signup CTAs are rejected',()=>{
  const bad=article();
  bad.sources=[{title:'Invented',url:'https://made-up.test'}];
  bad.body_markdown+=' MTN means maxillary tilt negative. [Aura](https://app.aura-looksmaxxing.com/register)';
  bad.image_prompts=[];
  const problems=validateContent(page,bad,sources).join(' ');
  assert.match(problems,/not found in research/);assert.match(problems,/Invented glossary/);assert.match(problems,/implemented tool/);assert.match(problems,/three visual/);
});
test('unknown tools and intervention topics cannot publish automatically',()=>{
  assert.ok(validateContent({...page,page_type:'tool',slug:'invented-tool'},article(),sources).includes('Tool has no implementation'));
  assert.ok(needsHumanReview({...page,primary_keyword:'jaw surgery'}));
  assert.ok(!needsHumanReview(page));
});
test('only citations actually returned by research become source evidence',()=>{
  assert.deepEqual(extractSources({content:[{type:'text',citations:[{type:'web_search_result_location',url:'https://primary.example',title:'Primary',cited_text:'Supported fact'},{type:'other',url:'https://unverified.example'}]}]}).map(s=>s.url),['https://primary.example']);
});
test('failed image review throws instead of silently publishing the image',async()=>{
  const client={messages:{create:async()=>({stop_reason:'end_turn',usage:{input_tokens:1,output_tokens:1},content:[{type:'text',text:'{"pass":false,"issues":["wrong subject"],"alt":"wrong"}'}]})}};
  await assert.rejects(reviewImage(client,Buffer.from('test'),{},()=>{}),/failed editorial review/);
});

test('text review sends cited evidence without the research history and reserves output for the verdict', async () => {
  let request, charged = false;
  const client = { messages: { create: async params => {
    request = params;
    return { stop_reason: 'end_turn', usage: { input_tokens: 50, output_tokens: 15 }, content: [{ type: 'text', text: '{"pass":true,"issues":[]}' }] };
  } } };
  const data = article();
  data._research = { confidentialHistory: 'DO_NOT_REPLAY' };
  const result = await reviewPage(client, page, data, {
    messages: [{ role: 'assistant', content: 'DO_NOT_REPLAY'.repeat(10000) }],
    sources: [...sources.map(s => ({ ...s, evidence: 'A complete cited excerpt.' })), { url: 'https://unused.example', evidence: 'UNUSED' }],
  }, () => { charged = true; });
  assert.equal(result.pass, true);
  assert.equal(request.messages.length, 1);
  assert.equal(request.output_config.effort, 'low');
  assert.equal(request.thinking, undefined);
  assert.ok(request.max_tokens <= 4096);
  assert.match(request.messages[0].content, /A complete cited excerpt/);
  assert.doesNotMatch(request.messages[0].content, /DO_NOT_REPLAY|UNUSED/);
  assert.equal(charged, true);
});

test('truncated and malformed review responses cannot approve publication and still record usage', async () => {
  for (const response of [
    { stop_reason: 'max_tokens', content: [{ type: 'text', text: '{"pass":true}' }] },
    { stop_reason: 'end_turn', content: [{ type: 'text', text: '{"pass":true,"issues":"none"}' }] },
  ]) {
    let charged = false;
    const client = { messages: { create: async () => ({ ...response, usage: { input_tokens: 1, output_tokens: 1600 } }) } };
    await assert.rejects(reviewPage(client, page, article(), { sources }, () => { charged = true; }));
    assert.equal(charged, true);
  }
});

test('a disclaimer denying a claim passes while the claim itself is still rejected', () => {
  const disclaimed = article();
  disclaimed.body_markdown += '\n\nIts scores are subjective photo-based estimates, not objective attractiveness measurements.';
  assert.deepEqual(validateContent(page, disclaimed, sources), []);

  for (const claim of [
    'Aura gives you an objective attractiveness score from one selfie.',
    'The model is scientifically accurate face rating technology.',
    'Your photos are never shared with third parties.',
  ]) {
    const bad = article();
    bad.body_markdown += '\n\n' + claim;
    assert.ok(validateContent(page, bad, sources).includes('Unsupported product claim'), claim);
  }
});

test('deterministic findings are told apart from the reviewer prose that blocks a release', () => {
  assert.ok(isDeterministicIssue('Unsupported product claim'));
  assert.ok(isDeterministicIssue('Unverified external link: https://made-up.test'));
  assert.ok(isDeterministicIssue('Missing body_markdown'));
  assert.ok(!isDeterministicIssue('What you cannot change: the article states canthal tilt is fixed, with no supporting source.'));
  assert.ok(!isDeterministicIssue('Clinical or intervention topic requires human review before publishing.'));
  for (const issue of DETERMINISTIC_ISSUES) assert.ok(isDeterministicIssue(issue));
});

test('a brief asking for lettering is refused, naming it to rule it out is not', () => {
  const withLabels = article();
  withLabels.image_prompts[0].prompt = 'A clean illustration showing seven simple face outlines in a row on a neutral background, each outline a smooth line drawing with a small one-word label beneath it.';
  assert.ok(validateContent(page, withLabels, sources).includes('Image brief asks for text inside the picture'));

  for (const prompt of [
    'A clean illustrated grid of four panels showing the same neutral cartoon face, consistent lighting and no labels or text anywhere in the frame at all.',
    'Overhead flat lay of five eyeglass frames arranged in a loose arc on light linen, shot without captions or annotations of any kind whatsoever.',
  ]) {
    const negated = article();
    negated.image_prompts[0].prompt = prompt;
    assert.deepEqual(validateContent(page, negated, sources), [], prompt);
  }
});

test('a rebrief is refused unless it returns three drawable briefs', async () => {
  const brief = (over = {}) => ({ prompt: 'A realistic editorial photograph of one person in a bright room, shot from the side with soft natural window light.', alt: 'A person', purpose: 'open the article', ...over });
  const reply = body => ({ messages: { create: async () => ({ stop_reason: 'end_turn', usage: { input_tokens: 10, output_tokens: 5 }, content: [{ type: 'text', text: JSON.stringify(body) }] }) } });
  const data = { title: 'T', description: 'D', body_markdown: 'Body' };

  const good = await rebriefImages(reply({ image_prompts: [brief(), brief({ prompt: brief().prompt + ' Two.' }), brief({ prompt: brief().prompt + ' Three.' })] }), page, data, () => {});
  assert.equal(good.length, 3);

  await assert.rejects(() => rebriefImages(reply({ image_prompts: [brief(), brief()] }), page, data, () => {}), /3 image brief/);
  await assert.rejects(() => rebriefImages(reply({ image_prompts: [brief(), brief(), brief()] }), page, data, () => {}), /duplicate/);
  await assert.rejects(() => rebriefImages(reply({ image_prompts: [
    brief({ prompt: 'A row of seven face outlines, each with a small one-word label beneath it on a neutral background.' }),
    brief({ prompt: brief().prompt + ' Two.' }), brief({ prompt: brief().prompt + ' Three.' }),
  ] }), page, data, () => {}), /text inside the picture/);
});

test('a partial rebrief only replaces the gaps and must differ from the briefs it keeps', async () => {
  const kept = 'Overhead flat lay of five eyeglass frames arranged in a loose arc on light linen, shot in soft daylight.';
  const fresh = 'Realistic editorial photograph of an optician in a bright shop handing a customer a pair of frames across a counter.';
  let sent;
  const reply = body => ({ messages: { create: async params => { sent = params.messages[0].content; return { stop_reason: 'end_turn', usage: { input_tokens: 10, output_tokens: 5 }, content: [{ type: 'text', text: JSON.stringify(body) }] }; } } });
  const data = { title: 'T', description: 'D', body_markdown: 'Body', image_prompts: [
    { prompt: kept, alt: 'Frames', purpose: 'open' }, { prompt: kept + ' Two.', alt: 'More', purpose: 'mid' }, { prompt: 'old third', alt: 'Old', purpose: 'end' },
  ] };

  const out = await rebriefImages(reply({ image_prompts: [{ prompt: fresh, alt: 'An optician', purpose: 'show the fitting step' }] }), page, data, () => {}, [3]);
  assert.equal(out.length, 1);
  // The kept briefs travel with the request so the new one can be made distinct.
  assert.match(sent, /positions 3/);
  assert.match(sent, /staying exactly as they are/);
  assert.ok(sent.includes(kept));

  // A replacement that repeats a brief being kept is refused.
  await assert.rejects(() => rebriefImages(reply({ image_prompts: [{ prompt: kept, alt: 'Frames', purpose: 'again' }] }), page, data, () => {}, [3]), /duplicate/);
  await assert.rejects(() => rebriefImages(reply({ image_prompts: [] }), page, data, () => {}, [3]), /1 image brief/);
});
