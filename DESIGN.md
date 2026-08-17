# Open Writer — DESIGN.md

> **System name:** Ink & Paper
> **Version:** 1.0 (Phase 8, 2026-08-17)
> **Platforms:** Web (GitHub Pages) and Windows (Electron) share one system.

Open Writer is a local-first writing studio. The design reads like a
**writer's desk**: warm paper in light mode, cool ink at night, one
restrained chromatic accent (indigo), and type that does the talking. It is
editorial, calm, and author-centric — never a generic SaaS dashboard.

## 1. Brand

- **Voice:** quiet, literate, precise. The product feels like good prose.
- **Wordmark:** "Open Writer" in a serif display face (Georgia /
  Source Serif stack), slightly tight tracking, small-caps eyebrows for
  section labels.
- **Mark:** a pen/ink glyph inside a rounded square in the brand accent.
- **Tone:** warm without being childish; modern without being trendy;
  professional; restrained.

## 2. Color

One chromatic accent: **indigo**. Everything else is ink + paper.

| Token | Light | Dark |
|---|---|---|
| `--background` (canvas) | `#faf7f2` warm paper | `#15161b` cool ink |
| `--foreground` (ink) | `#23201b` warm near-black | `#e9e7e1` warm off-white |
| `--card` / `--writer-surface` | `#fffdf9` warm white | `#1c1e25` |
| `--muted` | `#f3eee6` | `#1e2027` |
| `--muted-foreground` | `#867f74` | `#9b968c` |
| `--border` (hairline) | `#e7e0d4` | `rgba(255,255,255,0.09)` |
| `--writer-accent` (brand) | `#4f46e5` | `#818cf8` |
| `--writer-accent-soft` | `#eef2ff` | `#232645` |

- **Surfaces** use a ladder (canvas → surface → card) with hairlines —
  hierarchy comes from tone and rules, not shadows. Shadows are reserved
  for menus, dialogs, and the picker card — never decorative.
- **Semantic colors** stay true: `red` = destructive, `emerald` = success,
  **`orange` = warning** (conflicts, storage-full, health warnings),
  `sky` = informational. Amber is **not** a brand color — its utility scale
  is remapped to indigo (see §7).
- **Charts:** indigo `#4f46e5`, teal `#14b8a6`, violet `#8b5cf6`, orange
  `#f59e0b`, muted stone.
- **Accent options** (Settings → Appearance): Indigo (default), Emerald,
  Teal, Violet, Rose, Orange, Amber.

## 3. Typography

- **UI:** Geist Sans (variable, via next/font). Dense, legible, quiet.
- **Display:** Georgia / Source Serif 4 / Iowan Old Style serif stack
  (`--font-display`) for the wordmark, project names, dialog titles, and
  editor headings — the editorial voice.
- **Mono:** Geist Mono — for ids, paths, diagnostics only.
- **Editor:** user-selectable (Serif / Sans / Mono) at 17 px default, with
  **1.85 line-height** and balanced paragraph spacing — prose-first.
- **Headings** (`h1`–`h3`) inside the manuscript are serif, tightly
  tracked, and `text-wrap: balance`.
- Scale is 4px-based; labels/captions use 10–12 px with letterspacing where
  it aids scanning (section eyebrows, badges).

## 4. Spacing

- **4 px base grid:** 4, 8, 12, 16, 24, 32, 48.
- Panels: 12–16 px padding; cards: 16–24 px; sections: 24–32 px.
- Rail = 44–48 px wide; panel columns = 260–320 px.
- Editor max width ~700 px — a comfortable measure for prose.
- Empty states breathe: 48–64 px of vertical room.

## 5. Hierarchy & layout

- **Three-column writer's desk:** left rail (icons) + left panel (tree/
  entities) + center editor; top bar carries project, breadcrumb, actions;
  status bar shows word counts, save state, mode chips (Focus, Typewriter),
  sync state.
- **Information density:** high but calm. Density comes from 12 px type and
  tight rows, not from color.
- Section eyebrows (CHAPTERS, AI AGENT) are 10 px uppercase muted labels —
  the only uppercase in the system.

## 6. Components

- **Buttons:** primary = ink/foreground (or brand accent only for the
  single CTA on a screen); secondary = surface + hairline; ghost = text.
  Radius `md`. No gradients, no glow.
- **Cards:** surface + 1 px hairline, `lg` radius, optional `sm` shadow
  only when elevated (menus, dialogs, picker).
- **Badges:** hairline outline, 10 px, pill — status, sync state, entity
  type chips.
- **Dialogs:** centered, surface + hairline, `xl` radius, subtle shadow;
  `sm:max-w-md` for confirmations.
- **Forms:** inputs = surface + hairline; focus ring = brand accent 50%;
  labels 12 px.
- **Lists/trees:** rows highlight on hover with the soft accent tint; the
  active item uses the brand accent (indigo) — never a second hue.
- **Status dots:** save state (saved = muted, saving = pulsing brand,
  unsaved = orange), sync state (Local / Syncing / Synced / Conflict).

## 7. The amber→indigo remap (legacy)

The original theme was amber-heavy. Rather than leave 137 scattered
`amber-*` utilities, the **entire amber utility scale is remapped to
indigo** at the Tailwind theme level (`--color-amber-50…950` → indigo
scale). All existing `bg-amber-600`, `text-amber-400` etc. now render
indigo. True semantic warnings were re-pointed to **orange** explicitly
(storage conflicts, health/continuity warnings, save-state unsaved).
New code: prefer `--writer-accent` / `bg-amber-600`-style brand classes
(now indigo) for accents and `orange-*` for warnings — never invent a
third brand hue.

## 8. Motion

- 150–250 ms ease-out for hovers/fades; 250–300 ms for dialogs/panels.
- Only meaningful motion: panel slides, dialog scale-in, saving pulse,
  spinner rotation. No bounce, no marquee, no parallax.

## 9. Icons

- **Lucide** (stroke style) everywhere; 14–16 px in chrome, 18–20 px in
  empty states. Icons are always labeled or tooltipped — never emoji.

## 10. Editor rules

- Paper-like writing surface; no grid, no distractions.
- Paragraphs at 1.85 line-height; serif headings; blockquote uses the
  brand accent rule; selection tint = accent at 22 %.
- Placeholder text at 50 % muted opacity.
- Typewriter + Focus modes hide chrome, never content.

## 11. Web / Windows / mobile

- Web and Windows load the same bundle — one design system by
  construction. Desktop extras (tray, native menus) adopt the same
  language.
- Below 1024 px the panels collapse to drawers; the editor is always the
  center of gravity. Touch targets ≥ 36 px.

## 12. Accessibility

- Contrast: all ink-on-paper pairs ≥ 4.5:1 (muted foreground ≥ 3:1 for
  large text); the indigo accent meets AA on paper surfaces in both modes.
- Focus is always visible: accent ring + `outline-ring/50`.
- Keyboard-first: every panel, dialog, and palette reachable by keyboard
  (F8 notifications, ⌘K palette, ⌘/ shortcuts dialog).
- Reduced motion: respect `prefers-reduced-motion` — no pulsing save dot,
  no panel slides.
- Selection color carries no information alone (paired with shape/text).

## 13. Visual anti-patterns (never)

- ❌ Excessive yellow/amber branding (the old theme)
- ❌ Generic SaaS gradients, glassmorphism, glow, bevels
- ❌ Giant hero cards in the app; decorative shadows
- ❌ Emoji as UI icons; random animation; confetti everywhere
- ❌ Poorly tracked type, uppercase body text, arbitrary spacing
- ❌ More than one chromatic accent per surface
