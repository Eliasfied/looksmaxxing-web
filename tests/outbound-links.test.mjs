import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyLink, keptInlineLinks, capSources, relFor } from '../config/outbound-links.mjs';
import remarkOutboundLinks from '../scripts/remark-outbound-links.mjs';

test('links are classified as own, competitor, reference or other', () => {
  assert.equal(classifyLink('https://app.aura-looksmaxxing.com/tools/x'), 'own');
  assert.equal(classifyLink('https://www.trymaxxing.com/blogs/a'), 'competitor');
  assert.equal(classifyLink('https://softmaxx.io/x'), 'competitor');
  assert.equal(classifyLink('https://pmc.ncbi.nlm.nih.gov/articles/1'), 'reference');
  assert.equal(classifyLink('https://www.aad.org/x'), 'reference');
  assert.equal(classifyLink('https://dermatology.stanford.edu/x'), 'reference');
  assert.equal(classifyLink('https://www.warbyparker.com/x'), 'other');
  assert.equal(relFor('reference'), 'noopener');
  assert.equal(relFor('other'), 'nofollow noopener');
});

test('inline cap keeps references first, never competitors', () => {
  const urls = ['https://shop.example/a', 'https://trymaxxing.com/b', 'https://www.aao.org/c', 'https://shop.example/d', 'https://www.nature.com/e', 'https://www.aad.org/f', 'https://www.aao.org/c'];
  assert.deepEqual([...keptInlineLinks(urls)].sort(), [2, 4, 5]);
  assert.deepEqual([...keptInlineLinks(['https://shop.example/a', 'https://qoves.com/x', 'https://b.example/y'])].sort(), [0, 2]);
});

test('source list is short, deduplicated and competitor-free', () => {
  const sources = [
    { title: 'Shop', url: 'https://www.framesdirect.com/x' },
    { title: 'Rival', url: 'https://trymaxxing.com/y' },
    ...Array.from({ length: 6 }, (_, i) => ({ title: 'Study ' + i, url: `https://www.ncbi.nlm.nih.gov/${i}` })),
    { title: 'Study 0 again', url: 'https://www.ncbi.nlm.nih.gov/0' },
  ];
  const out = capSources(sources);
  assert.equal(out.length, 5);
  assert.ok(out.every((s) => s.url.includes('ncbi')));
  assert.equal(capSources([{ title: 'Shop', url: 'https://www.framesdirect.com/x' }])[0].rel, 'nofollow noopener');
  assert.deepEqual(capSources(undefined), []);
});

test('remark plugin unlinks extra and competitor links, keeping their text', () => {
  const link = (url, text) => ({ type: 'link', url, children: [{ type: 'text', value: text }] });
  const para = {
    type: 'paragraph',
    children: [
      link('https://trymaxxing.com/a', 'rival'),
      { type: 'text', value: ' and ' },
      link('https://www.aao.org/b', 'aao'),
      link('https://shop.example/c', 'shop1'),
      link('https://shop.example/d', 'shop2'),
      link('https://shop.example/e', 'shop3'),
      link('https://app.aura-looksmaxxing.com/tools/x', 'tool'),
    ],
  };
  const tree = { type: 'root', children: [para] };
  remarkOutboundLinks()(tree);
  const kinds = para.children.map((c) => (c.type === 'link' ? `link:${c.children[0].value}` : `text:${c.value}`));
  assert.deepEqual(kinds, ['text:rival', 'text: and ', 'link:aao', 'link:shop1', 'link:shop2', 'text:shop3', 'link:tool']);
  assert.equal(para.children[2].data.hProperties.rel, 'noopener');
  assert.equal(para.children[3].data.hProperties.rel, 'nofollow noopener');
  assert.equal(para.children[6].data, undefined, 'own links are untouched');
});
