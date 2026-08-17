# Design Rebuild — Verification Record (Phase 8)

Verified: **2026-08-17** · Branch `main` · Commit (this commit)
Build: production static export (`NEXT_PUBLIC_BASE_PATH=/open-writer`), served
exactly as GitHub Pages serves it.

## 1. What changed

| Area | Before | After |
|---|---|---|
| Brand accent | amber everywhere (137 `amber-*` refs, 35 files) | **indigo** — one restrained accent |
| Light canvas | `#faf9f7` cool grey-white | `#faf7f2` **warm paper** |
| Dark canvas | `#1c1917` warm grey | `#15161b` **cool ink** |
| Ink | `#1c1917` | `#23201b` warm near-black (light) / `#e9e7e1` (dark) |
| Hairlines | `#e7e5e4` | `#e7e0d4` warm (light) / `rgba(255,255,255,0.09)` (dark) |
| Display type | Geist everywhere | **Serif stack** (Georgia/Source Serif 4) for wordmark, project names, dialog titles, editor headings |
| Editor prose | 1.8 line-height | **1.85**, serif headings, `text-wrap: balance`, ink-tinted selection |
| Charts | amber-heavy | indigo / teal / violet / orange |
| Warnings | amber (collided with brand) | **orange** (dedicated semantic) |
| Accent choices | Emerald first | **Indigo** first (default), Amber last |

Mechanism: the **entire amber utility scale is remapped to indigo** at the
Tailwind theme level, converting all legacy brand usages in one stroke;
true warnings (storage conflict/full, health + continuity warning
severities, unsaved state) were explicitly re-pointed to orange.

## 2. Verification method

Screenshot compositing was unavailable in this environment, so QA was done
by **computed-style assertions** on the real rendered page (deterministic,
catches the same regressions) across both themes:

### Light mode
- `--background` = `#faf7f2` (warm paper), `--foreground` = `#23201b`
- `--writer-accent` = `#4f46e5` (indigo), soft = `#eef2ff`
- border `#e7e0d4`, muted `#f3eee6`

### Dark mode
- `--background` = `#15161b` (cool ink), `--foreground` = `#e9e7e1`
- `--writer-accent` = `#818cf8` (indigo-400), soft = `#232645`

### Remap correctness
- A `bg-amber-500` element (active sidebar rail item) computed as
  **`rgb(99, 102, 241)` = `#6366f1`** (indigo) in both modes — the remap
  is live, not just declared.
- Status-bar "OW" mark + Focus/Typewriter chips render indigo.

### Typography
- Project name in the top bar computes as **Georgia / Source Serif 4**
  (display serif applied).
- Open editor scene: paragraph **line-height 31.45 px @ 17 px = 1.85**,
  warm-ink text, prose spacing.

### Settings
- Accent selector lists **Indigo** first (new default), Amber last.
- Dialog title in display serif.

## 3. Platform parity

- **Web + Windows** load the identical bundle (Electron serves the same
  `out/`), so the design system applies to both by construction — no
  separate theme to drift.
- The accent `--writer-accent` is applied at runtime by ThemeSync from
  Appearance settings (indigo default), in both themes.

## 4. Regression checks

- `bunx tsc --noEmit` — clean
- `bunx eslint src` — clean
- Production build green; service worker regenerated (53 entries)
- No functional code touched — purely design tokens + class re-pointing

## 5. Remaining notes

- The screenshots for a final human visual pass are recommended when a
  compositing viewport is available (the computed-style checks cover token
  correctness; a designer's eye can still be applied on top).
- Some panels still carry small amber-derived tints that now read indigo
  (correct per the remap) — the long-tail polish (e.g., per-panel
  illustration, focus-mode flourish) is deliberately deferred to keep this
  phase token-safe and regression-free.
