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

test('Latch exports import into the studio and round trip without losing message content', () => {
  const original = { embeds: [{ title: 'Raid night', description: '@everyone Bring a friend', color: 0x73df9f }] };
  const portable = G.latch(original, 'raid-night');
  assert.deepEqual(G.parse(JSON.stringify(portable)), G.message(original));
  assert.deepEqual(G.latch(G.parse(JSON.stringify(portable)), 'raid-night'), portable);
  for (const document of [{ ...portable, version: 2 }, { ...portable, token: 'private' }, { ...portable, template: { ...portable.template, name: '../bad' } }, { ...portable, template: { ...portable.template, color: -1 } }, { ...portable, template: { ...portable.template, description: 'x'.repeat(4001) } }, { ...portable, template: { ...portable.template, title: '' } }]) assert.throws(() => G.parse(JSON.stringify(document)));
});

test('calendar rollover and nonexistent dates are refused instead of silently changing an event', () => {
  for (const date of ['2027-02-29T18:00:00Z', '2026-02-30T12:00:00Z', '2100-02-29T00:00:00Z', '2026-04-31T12:00:00Z', '2026-10-21T24:00:00Z', '2026-00-01T00:00:00Z', '2026-01-00T00:00:00Z', '2026-10-21T12:60:00Z', '2026-10-21T12:00:00+01:60']) {
    assert.throws(() => G.timestamp(date)); assert.throws(() => G.embed({ title: 'event', timestamp: date }));
  }
  assert.match(G.timestamp('2000-02-29T12:00:00Z'), /^<t:/);
  assert.match(G.timestamp('2028-02-29T12:00:00Z'), /^<t:/);
});

test('messages must round trip within the actual pretty-printed UTF-8 export budget', () => {
  const url = 'https://example.com/' + 'x'.repeat(1800);
  assert.throws(() => G.message({ embeds: Array.from({ length: 10 }, () => ({ title: 'x', url, author: { name: 'a', url, icon_url: url }, footer: { text: 'f', icon_url: url }, image: { url }, thumbnail: { url } })) }), /64 KiB/);
  const valid = G.message({ embeds: [{ description: '界'.repeat(4000) }] });
  assert.deepEqual(G.parse(JSON.stringify(valid, null, 2) + '\n'), valid);
});

test('template backups count UTF-8 bytes and exported formatting before accepting a shelf', () => {
  const url = 'https://example.com/' + 'x'.repeat(1800);
  const message = G.message({ embeds: Array.from({ length: 10 }, () => ({ description: '界'.repeat(600), image: { url }, thumbnail: { url } })) });
  const items = Array.from({ length: 20 }, (_, i) => ({ id: `id-${i}`, name: `Saved ${i}`, message }));
  assert.ok(JSON.stringify(items).length < 1048576);
  assert.throws(() => G.backup(items), /1 MiB/);
  const backup = G.backup(items.slice(0, 10));
  assert.ok(Buffer.byteLength(JSON.stringify(backup, null, 2) + '\n') <= 1048576);
  assert.deepEqual(G.backup(JSON.parse(JSON.stringify(backup)).templates), backup);
  assert.throws(() => G.backup([items[0], items[0]]), /unique/);
  assert.throws(() => G.backup([{ ...items[0], unexpected: true }]), /unsupported/);
});
