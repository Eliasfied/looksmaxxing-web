const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTs } = require('./helpers/load-ts.cjs');
const { aiModelOptions, aiProxyUrl, completedAIText } = loadTs('apps/web/lib/ai-model.ts');
const { analyzeTool } = loadTs('apps/web/lib/tool-analysis.ts');
const { tools } = loadTs('apps/web/lib/tool-report.ts');
const responseReport = () => ({ validPhoto: true, confidence: 0.9, potentialScore: 7.2, headline: 'Photo-specific styling', sections: [1, 2, 3].map(n => ({ title: `Finding ${n}`, text: 'An observation from the image', tasks: [] })), limitations: 'Lighting affects the estimate.' });
const complete = (content, extra = {}) => ({ choices: [{ finish_reason: 'stop', message: { content }, ...extra }] });

async function isolated(run) {
  const keys = ['FACE_ANALYSIS_MODEL', 'AI_CHAT_MODEL', 'FACE_ANALYSIS_URL', 'AI_CHAT_URL'];
  const before = keys.map(key => process.env[key]);
  const originalFetch = global.fetch;
  try { keys.forEach(key => delete process.env[key]); await run(); }
  finally {
    global.fetch = originalFetch;
    keys.forEach((key, i) => before[i] === undefined ? delete process.env[key] : process.env[key] = before[i]);
  }
}

test('Luna preserves bounded non-reasoning inference; explicit rollback uses the legacy request contract', async () => isolated(async () => {
  const luna = aiModelOptions('analysis', 2600, 0.2);
  assert.equal(luna.model, 'gpt-6-luna');
  assert.equal(luna.reasoning_effort, 'none');
  assert.equal(luna.max_completion_tokens, 2600);
  assert.ok(!Object.hasOwn(luna, 'max_tokens'));
  process.env.FACE_ANALYSIS_MODEL = 'gpt-4.1-mini';
  const rollback = aiModelOptions('analysis', 2600, 0.2);
  assert.equal(rollback.model, 'gpt-4.1-mini');
  assert.equal(rollback.max_tokens, 2600);
  assert.ok(!Object.hasOwn(rollback, 'reasoning_effort'));
  assert.ok(!Object.hasOwn(rollback, 'max_completion_tokens'));
  assert.equal(aiModelOptions('chat', 600, 0.7).model, 'gpt-6-luna');
  process.env.FACE_ANALYSIS_MODEL = 'unsupported';
  assert.throws(() => aiModelOptions('analysis', 2600, 0.2), /Unsupported/);
}));

test('all implemented tools send their focus, photo(s) and JSON contract through the configured proxy', async () => isolated(async () => {
  process.env.FACE_ANALYSIS_URL = 'https://proxy.example/chat';
  for (const tool of tools) {
    let calls = 0;
    const photos = tool.requiresComparison ? ['first-photo', 'second-photo'] : ['first-photo'];
    global.fetch = async (url, options) => {
      calls++;
      assert.equal(url, 'https://proxy.example/chat');
      const body = JSON.parse(options.body);
      assert.equal(body.model, 'gpt-6-luna');
      assert.equal(body.reasoning_effort, 'none');
      assert.equal(body.response_format.type, 'json_object');
      assert.equal(body.max_completion_tokens, 2600);
      assert.ok(body.messages[0].content[0].text.includes(tool.focus));
      assert.deepEqual(body.messages[0].content.slice(1).map(part => part.image_url.url), photos);
      assert.ok(options.signal instanceof AbortSignal);
      return Response.json(complete(JSON.stringify(responseReport())));
    };
    const report = await analyzeTool(tool, photos, 'Prefer low maintenance');
    assert.equal(report.potentialScore, 7.2);
    assert.equal(calls, 1);
  }
  process.env.AI_CHAT_URL = 'https://coach.example/chat';
  assert.equal(aiProxyUrl('chat'), 'https://coach.example/chat');
  assert.equal(aiProxyUrl('analysis'), 'https://proxy.example/chat');
}));

test('refusals and truncated JSON cannot become a paid report', () => {
  for (const value of [complete('{}', { finish_reason: 'length' }), complete('{}', { message: { content: '{}', refusal: 'declined' } }), complete(''), {}, null]) {
    assert.throws(() => completedAIText(value), /could not be completed/);
  }
});

test('provider rejection, malformed JSON and unsuitable photos fail without a second paid call', async () => isolated(async () => {
  for (const makeResponse of [
    () => Response.json({ error: 'Model unavailable' }, { status: 500 }),
    () => Response.json(complete('not JSON')),
    () => Response.json(complete(JSON.stringify({ ...responseReport(), validPhoto: false, confidence: 0 }))),
  ]) {
    let calls = 0;
    global.fetch = async () => { calls++; return makeResponse(); };
    await assert.rejects(analyzeTool(tools[0], ['photo'], ''));
    assert.equal(calls, 1);
  }
}));
