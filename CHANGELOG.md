# Changelog

## 0.2.0 - 2026-10-21

- Update or rename a saved template explicitly, with stable IDs, collision checks and preservation on storage failure.
- Import Latch's portable template JSON into the studio for round-trip editing.
- Reject nonexistent calendar dates and skipped local daylight-saving times.
- Enforce export/import limits against formatted UTF-8 bytes, including URL metadata and backup envelopes.
- Recover unreadable local template storage as its original raw data instead of exporting an empty backup.
- Add engine and desktop/mobile browser regressions for these workflows.

## 0.1.0 - 2026-10-21

- Introduce a private message studio with ten embeds, fields, author/footer editing, dark/light preview and safe JSON export.
- Add local named templates, portable backup/restore, undo and invalid-import preservation.
- Add Discord event timestamps, random teams and opening-round tournament brackets.
- Add compatible basic-template exports for Latch. No credentials or message delivery are included.
- Add schema/budget regressions and desktop/mobile browser workflow tests.
