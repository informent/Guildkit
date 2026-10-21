'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const G = require('../engine');
test('every starter preset is a valid independent message with no mentions enabled', () => {
  for (const name of G.presetNames) { const value = G.preset(name); assert.deepEqual(G.parse(JSON.stringify(value)), value); value.embeds[0].title = 'changed'; assert.notEqual(G.preset(name).embeds[0].title, 'changed'); assert.deepEqual(value.allowed_mentions, { parse: [] }); }
  assert.throws(() => G.preset('__proto__'));
});
test('Discord text budgets and field structure are enforced', () => {
  for (const value of [{ title: 'x'.repeat(257) }, { description: 'x'.repeat(4097) }, { fields: [{ name: 'name', value: '' }] }, { fields: Array.from({ length: 26 }, () => ({ name: 'n', value: 'v' })) }, { title: 'x', color: -1 }, { title: 'x', color: 0x1000000 }, { title: 'x', fields: [{ name: 'n', value: 'v', inline: 'yes' }] }, {}]) assert.throws(() => G.message({ embeds: [value] }));
  assert.throws(() => G.message({ content: 'x'.repeat(2001), embeds: [] }));
  assert.throws(() => G.message({ embeds: Array.from({ length: 11 }, () => ({ title: 'x' })) }));
  assert.throws(() => G.message({ embeds: [{ description: 'a'.repeat(4000) }, { description: 'a'.repeat(2001) }] }));
  assert.equal(G.message({ embeds: [{ description: 'a'.repeat(4000) }, { description: 'a'.repeat(2000) }] }).embeds.length, 2);
});
test('import never retains credentials, mention permissions or unsupported metadata', () => {
  for (const json of ['{', '{}', 'null', '[]', JSON.stringify({ embeds: [{ title: 'x' }], token: 'private' }), '{"embeds":[{"title":"x","__proto__":{}}]}', 'x'.repeat(65537)]) assert.throws(() => G.parse(json));
  assert.deepEqual(G.message({ embeds: [], content: '@everyone', allowed_mentions: { parse: ['everyone'] } }).allowed_mentions, { parse: [] });
});
test('media and link URLs require HTTPS without credentials and are never fetched', () => {
  for (const value of ['javascript:alert(1)', 'http://example.com/x', 'https://user:password@example.com/x', 'data:image/png;base64,abc', 'bad']) assert.throws(() => G.embed({ image: { url: value } }));
  assert.equal(G.embed({ thumbnail: { url: 'https://example.com/x.png' } }).thumbnail.url, 'https://example.com/x.png');
});
test('full embed fields, author, footer and timestamps normalize without mutating input', () => {
  const item = { title: 't', url: 'https://example.com', description: 'd', author: { name: 'a', icon_url: 'https://example.com/a.png' }, footer: { text: 'f' }, fields: [{ name: 'n', value: 'v', inline: true }], timestamp: '2026-10-21T20:00:00Z', color: 0 };
  const result = G.embed(item); assert.equal(G.characters(result), 6); assert.equal(result.timestamp, '2026-10-21T20:00:00.000Z'); assert.equal(item.timestamp, '2026-10-21T20:00:00Z');
});
test('event timestamps are timezone-aware and reject ambiguous local strings', () => {
  assert.equal(G.timestamp('2026-10-21T20:00:00Z', 'R'), G.timestamp('2026-10-21T17:00:00-03:00', 'R'));
  assert.equal(G.timestamp('1970-01-01T00:00:00Z', 'F'), '<t:0:F>');
  for (const value of ['2026-10-21T20:00', 'bad', '1969-12-31T23:59:59Z', null]) assert.throws(() => G.timestamp(value));
  assert.throws(() => G.timestamp('2026-10-21T20:00:00Z', 'X'));
});
test('Latch export matches its portable schema and refuses lossy conversions', () => {
  const message = { embeds: [{ title: 'hello', description: 'body', color: 42 }] };
  assert.deepEqual(G.latch(message, 'welcome'), { version: 1, kind: 'latch-template', template: { name: 'welcome', title: 'hello', description: 'body', color: 42 } });
  for (const value of [G.preset('game-night'), { ...message, content: 'extra' }, { embeds: [{ title: 't', description: 'x'.repeat(4001) }] }]) assert.throws(() => G.latch(value, 'welcome'));
  assert.throws(() => G.latch(message, '../name'));
});
