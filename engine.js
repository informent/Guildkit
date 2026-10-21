(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Guildkit = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const PRESETS = Object.freeze({
    'game-night': { title: 'Game night is on.', description: 'Squad up for a few rounds. All skill levels welcome.\n\nReact in the event channel to join. Bring a friend.', color: 0x73df9f, fields: [{ name: 'The game', value: 'Your game here', inline: true }, { name: 'When', value: 'Add an event timestamp', inline: true }], footer: { text: 'Good games. Better company.' } },
    'server-rules': { title: 'Make yourself at home.', description: 'A few ground rules for a good community.\n\n1. Be kind. Harassment and hate have no place here.\n2. Keep posts in the right channels.\n3. Protect personal information.\n4. Ask before advertising.\n5. Follow Discord\'s community guidelines.', color: 0x9ba8ff, footer: { text: 'Need a hand? Contact the moderation team.' } },
    'looking-for-group': { title: 'One more for the squad.', description: 'Looking for a friendly group? Post your game, region and availability below.', color: 0xf5bb70, fields: [{ name: 'Game / mode', value: 'Your game and mode', inline: true }, { name: 'Region', value: 'Your region', inline: true }, { name: 'Voice chat', value: 'Optional', inline: true }] },
    'announcement': { title: 'Something good is coming.', description: 'Share your next update with the community.\n\nKeep it clear, keep it useful, and give everyone a reason to get involved.', color: 0x73df9f }
  });
  const keys = (value, allowed, label) => {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !allowed.includes(key))) throw new Error(`${label} contains unsupported properties.`);
  };
  const text = (value, limit, label, required = false) => {
    if (value === undefined && !required) return undefined;
    if (typeof value !== 'string' || value.length > limit || (required && !value.trim()) || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)) throw new Error(`${label} must be ${required ? '1' : '0'} to ${limit} characters.`);
    return value;
  };
  function url(value, label) {
    text(value, 2048, label, true);
    let parsed; try { parsed = new URL(value); } catch { throw new Error(`${label} must be an HTTPS URL.`); }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error(`${label} must be an HTTPS URL without credentials.`);
    return parsed.href;
  }
  function embed(input) {
    keys(input, ['title', 'description', 'color', 'fields', 'footer', 'author', 'url', 'image', 'thumbnail', 'timestamp'], 'Embed');
    const output = {};
    for (const [key, limit] of [['title', 256], ['description', 4096]]) if (input[key] !== undefined) output[key] = text(input[key], limit, key);
    if (input.color !== undefined) {
      if (!Number.isInteger(input.color) || input.color < 0 || input.color > 0xffffff) throw new Error('Color must be an integer between 0 and 16777215.');
      output.color = input.color;
    }
    if (input.url !== undefined) output.url = url(input.url, 'Title URL');
    for (const key of ['image', 'thumbnail']) if (input[key] !== undefined) { keys(input[key], ['url'], key); output[key] = { url: url(input[key].url, key) }; }
    if (input.timestamp !== undefined) {
      if (typeof input.timestamp !== 'string' || input.timestamp.length > 40 || !Number.isFinite(Date.parse(input.timestamp))) throw new Error('Timestamp must be an ISO date.');
      output.timestamp = new Date(input.timestamp).toISOString();
    }
    if (input.author !== undefined) {
      keys(input.author, ['name', 'url', 'icon_url'], 'Author'); output.author = { name: text(input.author.name, 256, 'Author name', true) };
      for (const key of ['url', 'icon_url']) if (input.author[key] !== undefined) output.author[key] = url(input.author[key], `Author ${key}`);
    }
    if (input.footer !== undefined) {
      keys(input.footer, ['text', 'icon_url'], 'Footer'); output.footer = { text: text(input.footer.text, 2048, 'Footer', true) };
      if (input.footer.icon_url !== undefined) output.footer.icon_url = url(input.footer.icon_url, 'Footer icon');
    }
    if (input.fields !== undefined) {
      if (!Array.isArray(input.fields) || input.fields.length > 25) throw new Error('Use at most 25 fields.');
      output.fields = input.fields.map(field => { keys(field, ['name', 'value', 'inline'], 'Field'); if (field.inline !== undefined && typeof field.inline !== 'boolean') throw new Error('Field inline must be a boolean.'); return { name: text(field.name, 256, 'Field name', true), value: text(field.value, 1024, 'Field value', true), inline: field.inline === true }; });
    }
    if (!output.title?.trim() && !output.description?.trim() && !output.fields?.length && !output.image && !output.thumbnail && !output.author && !output.footer) throw new Error('Add some text or an image to your embed.');
    return output;
  }
  function characters(value) { return (value.title || '').length + (value.description || '').length + (value.author?.name || '').length + (value.footer?.text || '').length + (value.fields || []).reduce((sum, field) => sum + field.name.length + field.value.length, 0); }
  function message(input) {
    keys(input, ['content', 'embeds', 'allowed_mentions'], 'Message');
    const content = text(input.content ?? '', 2000, 'Message text');
    if (!Array.isArray(input.embeds) || input.embeds.length > 10) throw new Error('Use up to 10 embeds.');
    const embeds = input.embeds.map(embed);
    if (!content.trim() && !embeds.length) throw new Error('Add a message or embed.');
    if (embeds.reduce((sum, value) => sum + characters(value), 0) > 6000) throw new Error('Combined embed text must not exceed 6000 characters.');
    return { content, embeds, allowed_mentions: { parse: [] } };
  }
  function parse(json) {
    if (typeof json !== 'string' || new TextEncoder().encode(json).length > 65536) throw new Error('Choose a JSON message under 64 KiB.');
    let input; try { input = JSON.parse(json); } catch { throw new Error('This is not valid JSON.'); }
    return message(input);
  }
  function preset(name) { if (!Object.hasOwn(PRESETS, name)) throw new Error('Unknown preset.'); return message({ embeds: [structuredClone(PRESETS[name])] }); }
  function timestamp(date, style = 'F') {
    if (!['t', 'T', 'd', 'D', 'f', 'F', 'R'].includes(style)) throw new Error('Choose a supported timestamp style.');
    const milliseconds = typeof date === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(?:Z|[+-]\d\d:\d\d)$/.test(date) ? Date.parse(date) : NaN;
    if (!Number.isFinite(milliseconds) || milliseconds < 0 || milliseconds > 253402300799999) throw new Error('Choose a date from 1970 to 9999 with a timezone.');
    return `<t:${Math.floor(milliseconds / 1000)}:${style}>`;
  }
  function latch(input, name) {
    const value = message(input);
    if (typeof name !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,31}$/.test(name)) throw new Error('Use a lowercase template name of 1 to 32 letters, numbers, hyphens or underscores.');
    const item = value.embeds[0];
    if (value.content || value.embeds.length !== 1 || !item.title?.trim() || !item.description?.trim() || item.description.length > 4000 || Object.keys(item).some(key => !['title', 'description', 'color'].includes(key))) throw new Error('Latch templates support one title, description (up to 4000 characters) and color. Remove message text and other embed fields first.');
    return { version: 1, kind: 'latch-template', template: { name, title: item.title, description: item.description, color: item.color ?? 0x5865f2 } };
  }
  return Object.freeze({ message, embed, parse, preset, characters, timestamp, latch, presetNames: Object.keys(PRESETS) });
});
