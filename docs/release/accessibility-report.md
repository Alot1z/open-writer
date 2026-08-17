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

## 3. Not yet covered (honest gaps)

- **Automated axe/pa11y run**: not executed in this environment; the audit was
  code-inspection + live-DOM inspection based. An `axe-core` pass in CI would be
  the right follow-up.
- **Screen-reader walkthrough** (NVDA/VoiceOver): not performed; requires a
  human/assistive-tech environment.
- **Keyboard end-to-end walkthrough** of every panel: spot-checked, not exhaustive.

## Verdict

The systematic label gap is closed and reduced motion is supported. The app
inherits a solid semantic/focus foundation from its component library. Remaining
gaps are verification-depth items, not known defects.
