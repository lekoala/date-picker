# Contributing

This is a small package with a deliberately frozen public surface. Keep changes tied to the documented use cases and preserve the small surface.

Before a PR:

```bash
bun run verify
bun run test:browser
```

For interaction, accessibility, source lifecycle or CSS changes, also run the relevant cross-browser tests.

Architecture decisions belong in `docs/ARCHITECTURE.md`; user-facing API changes belong in `docs/API.md` and should include a test.
