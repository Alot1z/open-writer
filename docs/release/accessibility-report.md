# Accessibility Report — Phase 9

**Project:** Open Writer
**Date:** 2026-08-17
**Scope:** keyboard, focus, semantics, labels, dialogs, contrast, reduced motion (Web + Windows)

## Summary

The Phase 9 audit found one systematic gap — **icon-only buttons without accessible
names** — across the rail sidebar, top bar, and several panels. All were labeled.
Reduced-motion support (WCAG 2.3.3) was missing entirely and is now implemented.
The dialog/semantic infrastructure (shadcn-based) already provides correct focus
trapping, escape-to-close, and ARIA roles.

## 1. Issues found & fixed

### 1.1 Icon-only buttons lacked accessible names (fixed)
Several buttons rendered only an SVG icon with no `aria-label`/text, so screen
readers announced empty buttons:

| Surface | Buttons |
|---|---|
| Left rail (`left-sidebar.tsx`) | All 18 rail switches (panel names added as `aria-label`) |
| Top bar (`top-bar.tsx`) | Word count toggle, settings gear |
| Goals panel (`goals-panel.tsx`) | Edit / pause-resume / delete / save (labels include the goal type, e.g. `Edit word-count goal`) |
| Relationships panel | Add relationship |
| Flow widget | Expand / collapse |

### 1.2 Reduced motion (fixed)
No `prefers-reduced-motion` handling existed. Added a global guard in
`globals.css` (WCAG 2.3.3): when the user prefers reduced motion, all
animations and transitions collapse to effectively zero duration and
scroll-behavior becomes instant.

## 2. Verified already-correct (audited, no change needed)

| Area | Status |
|---|---|
| Keyboard | All interactive surfaces are native buttons/inputs; dialogs trap focus; Escape closes |
| Semantics | Headings, lists, regions (`Notifications (F8)`), tablists in settings dialog |
| Dialogs | `AlertDialog`/`Dialog` with proper roles, focus management, description |
| Forms | All inputs have visible labels; placeholder-only fields have label siblings |
| Focus visibility | Global `focus-visible` ring on all shadcn components; `:focus-visible:ring-2` on buttons |
| Color contrast | Light/dark palettes chosen for AA on text; accent reserved for interactive/emphasis, not body text |
| Windows parity | Desktop loads the byte-identical `out/` bundle — the same semantics apply |

## 3. Phase 11 — real automated axe-core run (was a gap, now closed)

The Phase 9 gap list flagged that axe had never actually run. Phase 11 closed
that: `scripts/axe-audit.mjs` launches the built app in headless Chrome, injects
`axe-core@4.13`, and audits **both** the project picker and the full writer
view (after creating a real project through the UI).

### Result: 11/11 checks pass — zero axe violations

| Check | Result |
|---|---|
| App shell renders (React hydrated) | ✅ |
| axe-core injected | ✅ |
| Project picker: zero violations | ✅ |
| Picker: no unnamed interactive controls | ✅ |
| Local API shim ready | ✅ |
| Create project via real UI flow | ✅ |
| Writer shell opened | ✅ |
| Writer view: zero violations | ✅ |
| Writer: no unnamed interactive controls | ✅ |
| Writer: `<main>` landmark + `<h1>` present | ✅ |

### Real issues found by the axe run (all fixed)

1. **No `<main>` landmark on any screen.** Both the project picker and both
   writer layouts (normal + focus) lacked a main landmark, and the picker had
   no top-level landmark at all. Fixed: `<main role>`-equivalent landmarks with
   `aria-label` on the writer content areas; `role="main"` on the picker.
   The first attempt placed `role="main"` on the outer shell and axe correctly
   flagged `landmark-banner-is-top-level` / `landmark-contentinfo-is-top-level`
   (TopBar `<header>` and StatusBar `<footer>` nested inside main) — fixed by
   scoping main to the content area only.
2. **No `<h1>` in the writer view.** The project name was a bare `<button>`;
   it is now an `<h1>` wrapping that button (still double-click editable).
3. **Low-contrast translucent text.** `text-amber-600/70` (word count label),
   `text-amber-600/60` (OW mark in status bar) and 10px `stone-500`
   separators/labels failed contrast. Bumped to solid `amber-700`/`stone-600`
   tones; the docs-panel `+` separator and flow-widget streak/words labels
   fixed too.
4. **Region violations from portal overlays.** The flow widget (floating,
   outside `<main>`) and the command palette's sr-only header triggered
   `region`. Fixed: `role="region" aria-label="Writing flow"` on the widget,
   and the command palette's `DialogHeader` moved **inside** `DialogContent`.

### Honest remaining note

`color-contrast` reports **2 incomplete** (not violations) — gradients/overlays
axe cannot compute; manual AA review of those specific surfaces is still
recommended. No `violations` remain on either audited screen.

## 4. Not yet covered (honest gaps)

- **Screen-reader walkthrough** (NVDA/VoiceOver): not performed; requires a
  human/assistive-tech environment.
- **Keyboard end-to-end walkthrough** of every panel: spot-checked; the 7
  documented global shortcuts are now verified live (`scripts/test-keyboard.mjs`),
  panel-internal flows are not exhaustively scripted.
- **axe in CI**: the run is scripted (`scripts/axe-audit.mjs`) but not yet wired
  into GitHub Actions; the Windows workflow that would carry it is still
  unpushed (token scope).

## Verdict

The systematic label gap is closed, reduced motion is supported, and — new in
Phase 11 — a **real axe-core run passes with zero violations** on the two
primary screens, backed by landmark/heading/contrast fixes. Remaining gaps are
verification-depth items, not known defects.
