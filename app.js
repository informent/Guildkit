'use strict';
(() => {
  const G = window.Guildkit, $ = id => document.getElementById(id);
  const DRAFT = 'guildkit.draft.v1', SHELF = 'guildkit.templates.v1';
  let draft = G.preset('game-night'), templates = [], selected = 0, activeTemplateId = null, shelfRecovery = false, history = [], noticeTimer, importMode = 'message', lineup = '';
  const clone = value => structuredClone(value);
  function notify(message, error = false) { clearTimeout(noticeTimer); $('notice').textContent = message; $('notice').classList.toggle('error', error); $('notice').hidden = false; noticeTimer = setTimeout(() => { $('notice').hidden = true; }, 6500); }
  function attempt(action) { try { const result = action(); if (result?.catch) result.catch(error => notify(error.message, true)); } catch (error) { notify(error.message, true); } }
  function store(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { notify('Browser storage is unavailable or full. Export a backup before leaving.', true); return false; } }
  function remember() { history.push({ draft: clone(draft), selected, activeTemplateId }); if (history.length > 30) history.shift(); $('undo-btn').disabled = false; }
  function persist() { try { store(DRAFT, G.message(draft)); } catch { /* Keep the previous valid draft while the user edits. */ } }
  function readTemplates(value) {
    return G.backup(value).templates;
  }
  try { const saved = localStorage.getItem(DRAFT); if (saved) draft = G.parse(saved); } catch { notify('A saved draft could not be loaded. It has not been deleted.', true); }
  try { const saved = localStorage.getItem(SHELF); if (saved) templates = readTemplates(JSON.parse(saved)); } catch { shelfRecovery = true; notify('Your saved templates could not be loaded. Back up templates to download the original data for recovery.', true); $('save-template').disabled = true; $('restore-templates').disabled = true; }
  function current() { return draft.embeds[selected]; }
  function node(tag, text, className) { const value = document.createElement(tag); if (text !== undefined) value.textContent = text; if (className) value.className = className; return value; }
  function markdown(element, text) {
    element.replaceChildren();
    for (const token of String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/g)) element.append(token.startsWith('**') && token.endsWith('**') ? node('strong', token.slice(2, -2)) : token.startsWith('`') && token.endsWith('`') ? node('code', token.slice(1, -1)) : document.createTextNode(token));
  }
  function render() {
    $('title-count').value = `${current()?.title?.length || 0} / 256`;
    $('description-count').value = `${current()?.description?.length || 0} / 4096`;
    $('color-value').textContent = $('color').value.toUpperCase();
    $('character-count').textContent = `${draft.embeds.reduce((sum, item) => sum + G.characters(item), 0).toLocaleString()} / 6,000 embed characters`;
    let valid = true;
    try { G.message(draft); $('validity').textContent = 'Ready to export'; } catch (error) { valid = false; $('validity').textContent = error.message; }
    $('validity').classList.toggle('error', !valid);
    for (const id of ['export-btn', 'copy-json', 'export-latch', 'save-template']) $(id).disabled = !valid || id === 'save-template' && $('restore-templates').disabled;
    $('update-template').disabled = !valid || !templates.some(item => item.id === activeTemplateId) || $('restore-templates').disabled;
    markdown($('preview-content'), draft.content || ''); $('preview-embeds').replaceChildren();
    for (const item of draft.embeds) {
      const card = node('div', undefined, 'discord-embed'); card.style.borderLeftColor = '#' + (item.color ?? 0x5865f2).toString(16).padStart(6, '0');
      if (item.author?.name) card.append(node('div', item.author.name, 'embed-author'));
      if (item.title) card.append(node('h3', item.title));
      if (item.description) { const body = node('p'); markdown(body, item.description); card.append(body); }
      if (item.fields?.length) {
        const fields = node('div', undefined, 'embed-fields');
        for (const field of item.fields) { const section = node('div', undefined, 'embed-field' + (field.inline ? ' inline' : '')); section.append(node('b', field.name)); const body = node('p'); markdown(body, field.value); section.append(body); fields.append(section); }
        card.append(fields);
      }
      if (item.image || item.thumbnail) card.append(node('div', 'Media URL preserved. Remote images are not loaded.', 'media-placeholder'));
      if (item.footer?.text || item.timestamp) card.append(node('div', [item.footer?.text, item.timestamp ? new Date(item.timestamp).toLocaleString() : ''].filter(Boolean).join(' · '), 'embed-footer'));
      $('preview-embeds').append(card);
    }
    $('add-embed').disabled = draft.embeds.length >= 10; $('remove-embed').disabled = !draft.embeds.length;
  }
  function fields() {
    $('fields').replaceChildren();
    (current()?.fields || []).forEach((field, index) => {
      const row = node('div', undefined, 'field-row');
      const name = node('input'); name.value = field.name; name.maxLength = 256; name.placeholder = 'Field name'; name.setAttribute('aria-label', `Field ${index + 1} name`);
      const value = node('textarea'); value.value = field.value; value.maxLength = 1024; value.rows = 2; value.placeholder = 'Field value'; value.setAttribute('aria-label', `Field ${index + 1} value`);
      const actions = node('div', undefined, 'field-actions'), label = node('label');
      const inline = node('input'); inline.type = 'checkbox'; inline.checked = field.inline === true; label.append(inline, document.createTextNode('Display inline'));
      const remove = node('button', 'Remove', 'text-button'); remove.type = 'button'; remove.setAttribute('aria-label', `Remove field ${index + 1}`);
      for (const [control, key] of [[name, 'name'], [value, 'value'], [inline, 'inline']]) control.addEventListener('input', () => { remember(); field[key] = control.type === 'checkbox' ? control.checked : control.value; persist(); render(); });
      remove.onclick = () => { remember(); current().fields.splice(index, 1); persist(); fields(); render(); };
      actions.append(label, remove); row.append(name, value, actions); $('fields').append(row);
    });
    $('add-field').disabled = !current() || (current().fields?.length || 0) >= 25;
  }
  function fill() {
    selected = Math.max(0, Math.min(selected, draft.embeds.length - 1));
    $('content').value = draft.content || ''; $('embed-select').replaceChildren();
    draft.embeds.forEach((_, i) => { const option = node('option', `Embed ${i + 1}`); option.value = i; $('embed-select').append(option); }); $('embed-select').value = selected;
    for (const key of ['title', 'description']) $(key).value = current()?.[key] || '';
    $('color').value = '#' + (current()?.color ?? 0x73df9f).toString(16).padStart(6, '0');
    $('author').value = current()?.author?.name || ''; $('footer').value = current()?.footer?.text || '';
    for (const id of ['title', 'description', 'color', 'author', 'footer']) $(id).disabled = !current();
    fields(); render();
  }
  function replace(value, templateId = null) { remember(); draft = value; selected = 0; activeTemplateId = templateId; persist(); fill(); }
  function download(name, value) {
    downloadText(name, JSON.stringify(value, null, 2) + '\n');
  }
  function downloadText(name, text) {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const link = node('a'); link.href = url; link.download = name; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  async function copy(value) { try { await navigator.clipboard.writeText(value); notify('Copied. Ready for your community.'); } catch { notify('Clipboard access was denied. Export a JSON file instead.', true); } }
  function shelf() {
    $('template-count').textContent = templates.length; $('template-shelf').replaceChildren();
    if (!templates.length) { const card = node('div', undefined, 'empty-shelf'); card.append(node('h2', 'Your next great announcement starts here.'), node('p', 'Save a message from the studio and it will appear on this shelf.', 'muted')); const link = node('a', 'Go to message studio ↗'); link.href = '#studio'; card.append(link); $('template-shelf').append(card); }
    templates.forEach(item => {
      const card = node('article', undefined, 'template-card'); card.append(node('h2', item.name), node('p', (item.message.embeds[0]?.description || item.message.content || 'Saved message').slice(0, 140)));
      const actions = node('div', undefined, 'inline-actions'), load = node('button', 'Open in studio ↗', 'text-button'), remove = node('button', 'Delete', 'text-button danger');
      load.onclick = () => { replace(clone(item.message), item.id); $('template-name').value = item.name; location.hash = '#studio'; notify('Template opened. Update it explicitly, or save a new copy with a different name.'); };
      remove.onclick = () => { if (!confirm(`Delete “${item.name}” from this browser?`)) return; const next = templates.filter(value => value.id !== item.id); if (store(SHELF, next)) { templates = next; if (activeTemplateId === item.id) activeTemplateId = null; shelf(); render(); notify('Template deleted.'); } };
      actions.append(load, remove); card.append(actions); $('template-shelf').append(card);
    });
  }
  function route() { const id = ['studio', 'templates', 'timestamps', 'teams', 'help'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'studio'; document.querySelectorAll('.view').forEach(view => { view.hidden = view.id !== id; }); document.querySelectorAll('[data-route]').forEach(link => { link.classList.toggle('active', link.dataset.route === id); if (link.dataset.route === id) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); }); if (id === 'templates') shelf(); }
  $('content').oninput = () => { remember(); draft.content = $('content').value; persist(); render(); };
  for (const id of ['title', 'description', 'color', 'author', 'footer']) $(id).oninput = () => {
    remember(); const item = current(); if (!item) return;
    const value = $(id).value;
    if (id === 'color') item.color = parseInt(value.slice(1), 16);
    else if (id === 'author' || id === 'footer') { if (value) item[id] = { ...item[id], [id === 'author' ? 'name' : 'text']: value }; else delete item[id]; }
    else { if (value) item[id] = value; else delete item[id]; }
    persist(); render();
  };
  $('undo-btn').onclick = () => { const previous = history.pop(); if (!previous) return; draft = previous.draft; selected = previous.selected; activeTemplateId = previous.activeTemplateId; $('undo-btn').disabled = history.length === 0; persist(); fill(); };
  $('embed-select').onchange = () => { selected = Number($('embed-select').value); fill(); };
  $('add-embed').onclick = () => { if (draft.embeds.length >= 10) return; remember(); draft.embeds.push({ title: 'New embed', color: 0x73df9f }); selected = draft.embeds.length - 1; persist(); fill(); };
  $('remove-embed').onclick = () => { if (!current()) return; remember(); draft.embeds.splice(selected, 1); persist(); fill(); };
  $('add-field').onclick = () => { if (!current() || (current().fields?.length || 0) >= 25) return; remember(); (current().fields ||= []).push({ name: 'Field name', value: 'Field value', inline: false }); persist(); fields(); render(); };
  document.querySelectorAll('[data-color]').forEach(button => { button.onclick = () => { $('color').value = button.dataset.color; $('color').dispatchEvent(new Event('input')); }; });
  document.querySelectorAll('[data-preset]').forEach(button => { button.onclick = () => { replace(G.preset(button.dataset.preset)); notify('Preset loaded. Undo brings back your previous draft.'); }; });
  $('export-btn').onclick = () => attempt(() => download('guildkit-message.json', G.message(draft)));
  $('copy-json').onclick = () => attempt(() => copy(JSON.stringify(G.message(draft), null, 2)));
  $('export-latch').onclick = () => attempt(() => { const value = G.latch(draft, 'guildkit-message'); const json = JSON.stringify(value, null, 2); if (json.length > 6000) throw new Error('Latch import accepts up to 6000 JSON characters. Shorten this message first.'); download('guildkit-latch-template.json', value); });
  $('save-template').onclick = () => attempt(() => { const name = $('template-name').value.trim(); if (!name || name.length > 60) throw new Error('Give your template a name of 1 to 60 characters.'); if (templates.length >= 50) throw new Error('Your shelf is full. Export or delete a template first.'); if (templates.some(value => value.name.toLowerCase() === name.toLowerCase())) throw new Error('That name is already saved. Use a different name for this version.'); const next = readTemplates([...templates, { id: crypto.randomUUID(), name, message: G.message(draft) }]); if (store(SHELF, next)) { templates = next; activeTemplateId = next.at(-1).id; shelf(); render(); notify('Template saved on this browser.'); } });
  $('update-template').onclick = () => attempt(() => {
    const name = $('template-name').value.trim(), index = templates.findIndex(item => item.id === activeTemplateId);
    if (index < 0) throw new Error('Open a saved template before updating it.');
    if (!name || name.length > 60) throw new Error('Give your template a name of 1 to 60 characters.');
    if (templates.some(item => item.id !== activeTemplateId && item.name.toLowerCase() === name.toLowerCase())) throw new Error('Another template already uses that name.');
    const next = [...templates]; next[index] = { ...templates[index], name, message: G.message(draft) };
    const validated = readTemplates(next);
    if (store(SHELF, validated)) { templates = validated; shelf(); notify('Saved template updated. Your other templates are unchanged.'); }
  });
  $('backup-templates').onclick = () => attempt(() => {
    if (shelfRecovery) {
      const raw = localStorage.getItem(SHELF);
      if (raw === null) throw new Error('No stored template data is available to recover.');
      downloadText('guildkit-templates-recovery.json', raw);
      notify('Original local data downloaded for recovery. This is not a validated template backup.');
    } else download('guildkit-templates.json', G.backup(templates));
  });
  $('import-btn').onclick = () => { importMode = 'message'; $('file-input').value = ''; $('file-input').click(); };
  $('restore-templates').onclick = () => { importMode = 'backup'; $('file-input').value = ''; $('file-input').click(); };
  $('file-input').onchange = () => attempt(async () => {
    const file = $('file-input').files[0]; if (!file) return;
    if (file.size > (importMode === 'backup' ? 1048576 : 65536)) throw new Error('File exceeds the import size limit.');
    const raw = await file.text();
    if (importMode === 'message') { replace(G.parse(raw)); notify('Message imported. Your previous draft is available with Undo.'); }
    else {
      const value = JSON.parse(raw); if (Object.keys(value).sort().join(',') !== 'kind,templates,version' || value.kind !== 'guildkit-backup' || value.version !== 1) throw new Error('Choose a Guildkit template backup.');
      const incoming = readTemplates(value.templates), next = readTemplates([...templates, ...incoming.map(item => ({ ...item, id: crypto.randomUUID() }))]);
      if (store(SHELF, next)) { templates = next; shelf(); notify(`${incoming.length} templates imported. Existing templates were kept.`); }
    }
  });
  $('clear-local').onclick = () => { if (!confirm('Remove this browser’s Guildkit draft and all saved templates? Export a backup first.')) return; try { localStorage.removeItem(DRAFT); localStorage.removeItem(SHELF); } catch { notify('Browser data could not be cleared.', true); return; } templates = []; history = []; shelfRecovery = false; activeTemplateId = null; draft = G.preset('game-night'); selected = 0; $('undo-btn').disabled = true; $('restore-templates').disabled = false; shelf(); fill(); notify('Local data cleared. The starter message is not saved until you edit it.'); };
  for (const mode of ['dark', 'light']) $(mode + '-preview').onclick = () => { $('discord-preview').classList.toggle('light', mode === 'light'); $('dark-preview').setAttribute('aria-pressed', mode === 'dark'); $('light-preview').setAttribute('aria-pressed', mode === 'light'); };
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone; $('timezone').textContent = `Your timezone: ${zone}. Discord shows each viewer their own local time.`;
  const date = new Date(Date.now() + 3600000); date.setSeconds(0, 0); $('event-date').value = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  function eventISO() {
    const value = $('event-date').value, date = new Date(value);
    if (!value || !$('event-date').validity.valid || !Number.isFinite(date.getTime())) throw new Error('Choose a valid date and time.');
    if (new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) !== value) throw new Error('That local time does not exist because the clocks change. Choose another time.');
    return date.toISOString();
  }
  function timestamps() {
    $('timestamp-results').replaceChildren();
    attempt(() => {
      const iso = eventISO();
      for (const [style, label] of [['F', 'Full date & time'], ['f', 'Short date & time'], ['R', 'Relative time'], ['t', 'Short time'], ['T', 'Time with seconds'], ['D', 'Full date'], ['d', 'Short date']]) {
        const button = node('button', undefined, 'timestamp-row'); const code = G.timestamp(iso, style); button.append(node('span', label), node('code', code)); button.onclick = () => copy(code); $('timestamp-results').append(button);
      }
    });
  }
  $('event-date').oninput = timestamps;
  $('copy-event').onclick = () => attempt(() => { const title = $('event-title').value.trim().replace(/@/g, '\uff20').replace(/[\\`*_~|<>\[\]()]/g, '\\$&'); if (!title) throw new Error('Give the event a name.'); copy(`**${title}**\n${G.timestamp(eventISO(), 'F')} · ${G.timestamp(eventISO(), 'R')}`); });
  function randomInt(bound) { const value = new Uint32Array(1), limit = Math.floor(4294967296 / bound) * bound; do { crypto.getRandomValues(value); } while (value[0] >= limit); return value[0] % bound; }
  function players() { const value = $('players').value; const names = value.split(',').map(name => name.trim()); if (value.length > 1000 || names.length < 2 || names.length > 32 || names.some(name => !name || name.length > 32 || /[\x00-\x1f\x7f]/.test(name)) || new Set(names.map(name => name.normalize('NFKC').toLowerCase())).size !== names.length) throw new Error('Use 2 to 32 unique names, separated by commas, up to 32 characters each.'); for (let i = names.length - 1; i > 0; i--) { const j = randomInt(i + 1); [names[i], names[j]] = [names[j], names[i]]; } return names.map(name => name.replace(/@/g, '\uff20').replace(/[\\`*_~|<>\[\]()]/g, '\\$&')); }
  $('draw-teams').onclick = () => attempt(() => { const names = players(), count = Number($('team-count').value); if (!Number.isInteger(count) || count < 2 || count > 8 || count > names.length) throw new Error('Choose 2 to 8 teams, with at least one player per team.'); const groups = Array.from({ length: count }, () => []); names.forEach((name, i) => groups[i % count].push(name)); lineup = groups.map((group, i) => `Team ${i + 1}: ${group.join(', ')}`).join('\n'); $('team-result').textContent = lineup; $('copy-teams').disabled = false; });
  $('draw-bracket').onclick = () => attempt(() => { const names = players(), size = 2 ** Math.ceil(Math.log2(names.length)), byes = size - names.length, lines = []; for (let i = 0; i < byes; i++) lines.push(`Match ${lines.length + 1}: ${names.shift()} (bye)`); while (names.length) lines.push(`Match ${lines.length + 1}: ${names.splice(0, 2).join(' vs ')}`); lineup = 'Opening round\n' + lines.join('\n'); $('team-result').textContent = lineup; $('copy-teams').disabled = false; });
  $('copy-teams').onclick = () => copy(lineup);
  window.addEventListener('hashchange', route); fill(); shelf(); timestamps(); route();
})();
