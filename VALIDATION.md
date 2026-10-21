# Verification scope

Engine tests validate per-property Discord limits, aggregate embed text budgets, unknown-property rejection, malformed/oversized JSON, credential-bearing URLs, disabled mentions, preset isolation, timezone conversion and lossless Latch exports.

Browser tests exercise editing/preview, undo, field operations, named-template persistence, template backup/restore, message import/export, invalid-payload preservation, XSS-shaped text, event timestamps, random teams, brackets and mobile layout. Test requests are restricted to loopback; the product has no external request path.

Automated tests do not certify live Discord rendering or bot permissions. Guildkit does not send messages, so no live delivery is represented as verified. Browser storage varies with user settings; save a JSON backup of anything important. Client-side validation cannot make a third-party bot or webhook safe.

Design-service generation was unavailable during the first implementation because the service required an account connection. No generated design, fidelity comparison or external design review is claimed.
