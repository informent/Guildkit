# Guildkit

**Your community, well put together.**

A free, private Discord toolkit for gaming communities, volunteer moderators and creators. Build reusable messages, plan events across timezones, and get game night started without accounts or subscriptions.

## Use it

[Open Guildkit](https://informent.github.io/Guildkit/) · [Report a bug](https://github.com/informent/Guildkit/issues)

The app runs entirely in your browser. It never requests a Discord token, connects to a webhook, sends a message, or loads remote media. Export message JSON for your own bot or integration. Copy timestamp codes and team draws directly into Discord.

### Message studio

- Edit up to ten embeds with live dark/light previews, accent colors, author, footer and up to 25 fields per embed.
- Start with game-night, server-rules, looking-for-group and announcement presets.
- Enforce individual text limits and the combined 6,000-character embed budget before export.
- Import/export message JSON. Exported messages always disable mentions.
- Undo edits and keep up to 50 named templates in this browser, with portable backup/restore.
- Open a saved template and choose **Update saved template** to edit or rename it in place. **Save as new** keeps a separate copy. Name collisions and failed storage writes preserve the existing template.
- Export simple title/body/color templates for [Latch](https://github.com/informent/Latch)'s `/template import` command. Latch imports are new templates, never silent replacements.
- Import a Latch JSON export back into the studio, edit it, and export it again.

### Event timestamps

Choose a date in your device timezone and copy any of Discord's seven timestamp formats. A full event announcement includes both the precise time and a relative countdown. Discord renders these for each viewer's timezone. Check local times around daylight-saving transitions.

Invalid calendar dates and skipped local times during a spring clock change are rejected rather than silently moved. A repeated time during an autumn clock change uses the browser's default occurrence; verify its UTC offset if that distinction matters.

### Game night

Draw random teams balanced by player count, or a single-elimination opening round with byes. Supports 2 to 32 unique names. Uses Web Crypto randomness; no player records, scores, ratings, bets or currency. Later tournament rounds are managed manually.

## Run locally

Install Node.js 22.9 or newer, then:

```sh
npm start
# Open http://127.0.0.1:4317
```

No dependency installation is needed to run the product. `npm run build` copies the self-contained static app to `dist/`, suitable for GitHub Pages or any static host. The local server binds only to your computer's loopback interface and exposes only the app's five files.

## Privacy and limits

Drafts and templates use unencrypted browser local storage. Use **Clear local data** on shared computers and back up templates before clearing site data. The last valid draft is kept while an incomplete edit is in progress. Storage failures are reported; backup import preserves existing templates and never silently overwrites them. Message imports are limited to 64 KiB and shelf backups to 1 MiB.

Export limits count the actual formatted UTF-8 file, including non-English text and URL metadata. If existing shelf data cannot be read, **Back up templates** downloads the original raw data for recovery instead of an empty shelf. That recovery file is not a validated backup and may need repair before import.

JSON is not a message you can paste into Discord chat. This app creates payloads for a bot/webhook integration; it does not publish them. For direct posting, copy event announcements or game-night text, or use Latch's template commands. Remote URLs in imported embeds are preserved but are not fetched. Preview supports bold and inline code; it is an approximation, not a replica of Discord's Markdown renderer.

This is an early release. There is no cloud sync, hosted bot, webhook credential storage, moderation dashboard or native mobile app. Independent project, not affiliated with Discord.

## Verification

```sh
npm test
npm run check
npm run build
```

CI also runs real Chromium interaction tests on desktop and mobile widths. Engine tests cover message limits, schema rejection, safe URLs, timezone-aware timestamps and Latch portability. Test fixtures contain no credentials and no Discord traffic. See [VALIDATION.md](VALIDATION.md).

## License

MIT. No account, paid tier, analytics, remote fonts or runtime dependencies.
