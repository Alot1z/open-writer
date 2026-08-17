# Design Research — Phase 8 (Ink & Paper)

Research conducted 2026-08-17 to rebuild Open Writer's visual identity from
the amber AI-generated theme to a deliberate editorial system.

## Sources

### DesignMD (designmd.co)

DesignMD is a catalog of **DESIGN.md design contracts** — plain-text
design systems AI agents can read. It frames the deliverable format used
here (`DESIGN.md`): brand, color tokens with exact hexes, typography
scale, spacing scale, component recipes, and **rules that must not be
broken**.

The strongest analyzed contract was **Linear's** (via the
VoltAgent/awesome-design-md catalog):

- **Canvas/surface ladder** — `#010102` canvas → surface-1..4 with
  hairline borders; hierarchy from tone, not shadow.
- **One restrained chromatic accent** used on brand, focus, and a single
  CTA — never decoratively; no second chromatic color, no gradients.
- **Negative tracking** scaled from display (−3 px) to body (−0.05 px).
- Cards `rounded-lg` (12 px) with 1 px hairlines — never pill.
- Product screenshots do the heavy lifting; chrome stays minimal.

Applied to Open Writer: the surface ladder (warm paper / cool ink), the
"one accent, used scarcely" rule (indigo), hairline borders over shadows,
and the DESIGN.md contract format itself.

### Novlr (novlr.org) — product/UX reference

Novlr is the product reference (feature/UX, **not** visual identity):

- Goals, streaks, word-count widget, sprint timer, notes sidebar pinned
  beside the manuscript, focus mode, typewriter setting, version history,
  analytics, comments, publishing sites — all of which Open Writer
  already implements; the redesign should present them with the same
  writer's-desk calm (dense sidebar + serene editor center).
- Dark mode is a first-class nightly environment.
- Editorial copy tone throughout.

### Editorial & tool canon

- **iA Writer / Ulysses** — the writing surface is the product: paper
  background, 1.5–1.85 line-height prose, serif display, chrome that
  disappears in focus mode. Source of the 1.85 editor line-height and
  serif editor headings.
- **Raycast / IDE rails** — dense 44 px icon rails with tooltips and
  keyboard-first navigation; source of the left rail + 12 px dense rows.
- **Linear / Notion** — calm density, restrained color, hairline
  structure.

## Decisions recorded

| Decision | Rationale |
|---|---|
| Indigo brand accent (replaces amber) | Editorial, professional, distinct from the old AI-slop amber; one restrained hue per Linear |
| Warm-paper light / cool-ink dark | Author-centric "writer's desk" feel; warm neutrals avoid sterile grey |
| Serif display for wordmark + editor headings | Editorial voice; Geist stays for UI density |
| Amber utility scale remapped → indigo | 137 legacy `amber-*` utilities convert in one stroke; warnings explicitly re-pointed to orange so semantics survive |
| Orange = warnings, red = destructive, emerald = success | True semantic palette preserved after the remap |
| Hairlines over shadows | Linear's hierarchy-by-tone; calmer, less SaaS |
| 1.85 editor line-height, balanced paragraphs | Prose-first readability (iA Writer canon) |

## Anti-patterns (from research)

- Excessive yellow/amber (old theme), generic SaaS gradients/glass, giant
  cards, emoji icons, decorative shadows, uppercase body text — all
  explicitly banned in DESIGN.md §13.
