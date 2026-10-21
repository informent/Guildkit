const { test, expect } = require('@playwright/test');
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => route.request().url().startsWith('http://127.0.0.1:4317/') ? route.continue() : route.abort());
  await page.goto('/');
});
test('first-run studio is ready and includes no browser errors', async ({ page }, info) => {
  await expect(page.locator('#validity')).toHaveText('Ready to export');
  await expect(page.locator('#preview-embeds h3')).toHaveText('Game night is on.');
  await page.screenshot({ path: `test-results/guildkit-${info.project.name}.png`, fullPage: true });
});
test('studio edits, undo, fields, themes and layout work without external requests', async ({ page }, info) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await expect(page.locator('#title')).toHaveValue('Game night is on.');
  await page.locator('#title').fill('Our next raid'); await expect(page.locator('#preview-embeds h3')).toHaveText('Our next raid');
  await page.locator('#undo-btn').click(); await expect(page.locator('#title')).toHaveValue('Game night is on.');
  await page.locator('#add-field').click(); await expect(page.locator('.field-row')).toHaveCount(3);
  await page.getByLabel('Field 3 name', { exact: true }).fill('Bring'); await page.getByLabel('Field 3 value', { exact: true }).fill('A good attitude'); await expect(page.locator('.embed-field').last()).toContainText('A good attitude');
  await page.locator('#light-preview').click(); await expect(page.locator('#discord-preview')).toHaveClass(/light/);
  await page.locator('#description').fill('<img src=x onerror=alert(1)> **hello**'); await expect(page.locator('#preview-embeds img')).toHaveCount(0); await expect(page.locator('#preview-embeds strong')).toHaveText('hello');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: `test-results/studio-${info.project.name}.png`, fullPage: true });
});
test('named templates persist and restore creates a separate copy', async ({ page }) => {
  await page.locator('#template-name').fill('Friday raid'); await page.locator('#save-template').click();
  await page.goto('/#templates'); await expect(page.locator('.template-card')).toHaveCount(1);
  const downloadPromise = page.waitForEvent('download'); await page.locator('#backup-templates').click(); const download = await downloadPromise;
  const file = await download.path();
  await page.locator('#restore-templates').click(); await page.locator('#file-input').setInputFiles(file);
  await expect(page.locator('.template-card')).toHaveCount(2);
  await page.reload(); await expect(page.locator('.template-card')).toHaveCount(2);
});
test('message imports validate before replacing drafts, and export JSON disables mentions', async ({ page }) => {
  await page.locator('#import-btn').click(); await page.locator('#file-input').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"token":"private"}') });
  await expect(page.locator('#notice')).toContainText('unsupported properties'); await expect(page.locator('#title')).toHaveValue('Game night is on.');
  await page.locator('#file-input').setInputFiles({ name: 'good.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ content: '@everyone', embeds: [{ title: 'Imported', description: 'Body' }], allowed_mentions: { parse: ['everyone'] } })) });
  await expect(page.locator('#title')).toHaveValue('Imported');
  const downloadPromise = page.waitForEvent('download'); await page.locator('#export-btn').click(); const download = await downloadPromise;
  const fs = require('node:fs'); const value = JSON.parse(fs.readFileSync(await download.path(), 'utf8')); expect(value.allowed_mentions).toEqual({ parse: [] }); expect(value.embeds[0].title).toBe('Imported');
  await page.locator('#title').fill(''); await page.locator('#description').fill(''); await expect(page.locator('#export-btn')).toBeDisabled();
  await page.reload(); await expect(page.locator('#title')).toHaveValue(''); await expect(page.locator('#description')).toHaveValue('Body');
});
test('timestamps and game-night tools work and suppress mentions', async ({ page }, info) => {
  await page.goto('/#timestamps'); await expect(page.locator('.timestamp-row')).toHaveCount(7); await page.locator('#event-date').fill('2027-01-01T19:00'); await expect(page.locator('.timestamp-row').first()).toContainText('<t:');
  await page.goto('/#teams'); await page.locator('#players').fill('Alex,Jamie,Morgan,Sam,Robin'); await page.locator('#draw-teams').click();
  await expect(page.locator('#team-result')).toContainText('Team 1:'); await expect(page.locator('#team-result')).toContainText('Robin');
  await page.locator('#draw-bracket').click(); await expect(page.locator('#team-result')).toContainText('(bye)');
  await page.locator('#players').fill('Alex,alex'); await page.locator('#draw-teams').click(); await expect(page.locator('#notice')).toContainText('unique names');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/game-night-${info.project.name}.png`, fullPage: true });
});

test('saved templates update explicitly, preserve IDs and refuse name collisions', async ({ page }) => {
  await page.locator('#template-name').fill('Friday raid'); await page.locator('#save-template').click();
  await page.locator('#template-name').fill('Backup copy'); await page.locator('#save-template').click();
  await page.goto('/#templates'); await page.locator('.template-card').first().getByRole('button', { name: 'Open in studio' }).click();
  const id = await page.evaluate(() => JSON.parse(localStorage.getItem('guildkit.templates.v1'))[0].id);
  await page.locator('#title').fill('A different raid'); await page.locator('#template-name').fill('Backup copy'); await page.locator('#update-template').click();
  await expect(page.locator('#notice')).toContainText('already uses that name');
  await page.locator('#template-name').fill('Sunday raid'); await page.locator('#update-template').click();
  await page.goto('/#templates'); await expect(page.locator('.template-card')).toHaveCount(2);
  await expect(page.locator('.template-card').first().getByRole('heading')).toHaveText('Sunday raid');
  await page.reload(); await page.locator('.template-card').first().getByRole('button', { name: 'Open in studio' }).click();
  await expect(page.locator('#title')).toHaveValue('A different raid');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('guildkit.templates.v1'))[0].id)).toBe(id);
});

test('failed template writes preserve the saved message and corrupted shelves can be recovered', async ({ page }) => {
  await page.locator('#template-name').fill('Keep me'); await page.locator('#save-template').click();
  await page.evaluate(() => { const original = Storage.prototype.setItem; Storage.prototype.setItem = function (key, value) { if (key === 'guildkit.templates.v1') throw new DOMException('Quota', 'QuotaExceededError'); return original.call(this, key, value); }; });
  await page.locator('#title').fill('Unsaved change'); await page.locator('#update-template').click();
  await expect(page.locator('#notice')).toContainText('unavailable or full');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('guildkit.templates.v1'))[0].message.embeds[0].title)).toBe('Game night is on.');
  await page.reload(); await page.evaluate(() => localStorage.setItem('guildkit.templates.v1', '{broken original data'));
  await page.reload(); await expect(page.locator('#save-template')).toBeDisabled();
  await page.goto('/#templates'); const pending = page.waitForEvent('download'); await page.locator('#backup-templates').click(); const download = await pending;
  expect(require('node:fs').readFileSync(await download.path(), 'utf8')).toBe('{broken original data');
});

test('Latch JSON imports preview safely and daylight-saving gaps are rejected', async ({ page }) => {
  await page.locator('#import-btn').click(); await page.locator('#file-input').setInputFiles({ name: 'latch.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ version: 1, kind: 'latch-template', template: { name: 'welcome', title: 'Welcome back', description: '@everyone **Hello**', color: 42 } })) });
  await expect(page.locator('#title')).toHaveValue('Welcome back'); await expect(page.locator('#preview-embeds strong')).toHaveText('Hello');
  const context = await page.context().browser().newContext({ timezoneId: 'America/New_York' });
  try {
    const eventPage = await context.newPage(); await eventPage.goto('http://127.0.0.1:4317/#timestamps'); await eventPage.locator('#event-date').fill('2027-03-14T02:30');
    await expect(eventPage.locator('#notice')).toContainText('does not exist'); await expect(eventPage.locator('.timestamp-row')).toHaveCount(0);
  } finally { await context.close(); }
});
