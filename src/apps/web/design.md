# Vessa Design System

Design principles for building UI in the Vessa register: quiet chrome, one loud accent, living motion, and copy that says the true thing once. Extracted from the marketing homepage (desktop + mobile).

---

## 1. Core principles

1. **One loud color, held back until it counts.** Ink, paper, and cool greys do almost all of the work. Ultramarine (`#1F2DE6`) appears only for primary action, emphasis, and punchlines.
2. **The page is the artifact.** Prefer a live, interactive surface over a static download. Values should be copyable; motion should play in place.
3. **Quiet chrome, loud content.** Hairline dashed rules and flat panels frame content. No heavy shadows, glass stacks, or decorative gradients on UI chrome.
4. **Motion is a product feature.** Easing and duration are real values on the page — not metaphors. Defaults are short, decisive, and never drift.
5. **Write like a coach who respects you.** Short, direct, second person, present tense. No hype, no slogan-decoding, no fake scarcity.
6. **Edit once, every link updates.** Prefer single-source surfaces: one URL, one token set, one component vocabulary.
7. **Building stays free; publishing is the gate.** Clarity about cost and ownership beats dark patterns.

---

## 2. Brand voice

### Tone

| Do | Don't |
| --- | --- |
| Say the measurable thing | Superlatives you can't back up |
| Describe what it does, then stop | Shouting the pitch |
| Write to the person using it | Write for the spectator |
| Plain over clever | Wordplay that needs decoding |
| Short sentences, concrete nouns | Corporate filler |

### Patterns from the homepage

- **Problem → turn.** Long graphite prose for the pain, then a single accent-colored line for the pivot: *“That was the only way to hand one over. It isn't anymore.”*
- **Promise in the headline.** Hero H1 states the outcome, not the category: *“Animated brand guidelines your clients actually use.”*
- **Honest constraints.** FAQ answers with “No” when needed (*custom domains*), and explains why.
- **Social proof is small.** `590+ designers signed up` sits at caption scale — not a billboard metric.

### Meta voice (for reference)

> Nobody opens the PDF. Vessa puts your brand guidelines at a link where colors copy when you click them and the motion plays in the page.

---

## 3. Color

### Core palette

| Token | Hex | RGB | Role |
| --- | --- | --- | --- |
| **Ink** | `#101216` | `16, 18, 22` | Primary text, dark stages, logo on light |
| **Paper** | `#EEF0F3` | `238, 240, 243` | Page background, theme-color |
| **Ultramarine / Accent** | `#1F2DE6` | `31, 45, 230` | Primary CTA, links, punchlines, focus ring |
| **Graphite** | `#3F434B` | `63, 67, 75` | Body / secondary text |
| **Fog** | `#D3D7DE` | `211, 215, 222` | Hairlines, soft borders |
| **Dash border** | `#A2A3A5` | `162, 163, 165` | Dashed module rules |
| **Ink faint** | `#676D78` | `103, 109, 120` | Muted labels, inactive tabs |
| **On-accent** | `#FFFFFF` | `255, 255, 255` | Text/icons on Ultramarine |

### Surfaces

| Token | Hex | Role |
| --- | --- | --- |
| `--v-bg` / stage light | `#F6F7F9` | Soft stage behind demos |
| `--vessa-surface` | `#F5F6F8` | Cards / elevated panels |
| `--vessa-paper-2` / muted | `#E5E8EC` | Secondary fills, pill tracks |
| `--vessa-well` / bright | `#FCFDFE` | Input wells, bright insets |
| Stage dark | `#101216` | Dark hero strips, close sections |

### Semantic

| Token | Hex | Role |
| --- | --- | --- |
| Danger | `#B42318` | Errors / destructive |
| Danger on dark | `#E96359` | Errors on ink stages |
| Success | `#15803D` | Success states |
| Success soft | `#E3F1E9` | Success backgrounds |

### Usage rules

- Background of the marketing page is **Paper**, not pure white.
- Body copy defaults to **Graphite**; headings and strong UI to **Ink**.
- **Accent** is scarce: primary buttons, inline doc links, the stakes punchline, focus rings.
- Clickable color swatches copy hex on click — treat hex as a first-class UI value.
- Never invent a second brand accent. Cool greys absorb the rest.

---

## 4. Typography

### Family

- **Switzer** (variable, Fontshare) for everything on the marketing surface — display and UI.
- Fallback: `ui-sans-serif, system-ui, sans-serif`.
- Mono (data / hex / code): system UI mono stack.

> Product guideline demos (e.g. VANTA) may pair Switzer (display) with General Sans (text). The Vessa homepage itself is Switzer-only.

### Marketing type scale (homepage, ~1920px)

| Role | Size | Weight | Line-height | Tracking |
| --- | --- | --- | --- | --- |
| Hero H1 | 56px | 500 | ~1.02 (57px) | −2.52px |
| Section H2 | 44px | 500 | ~1.05 (46px) | −1.54px |
| Editorial stakes | 32px | 400 | ~1.45 (46px) | −0.70px |
| Card / feature H3 | 19px | 500 | ~1.35 (26px) | −0.29px |
| Lead body | 18px | 400 | ~1.55 (28px) | normal · Graphite |
| UI / nav / FAQ Q | 14–16px | 400–500 | 1.5 | normal |
| Caption / proof | 13px | 500 | ~1.2 | normal |
| Micro | 12px | 400–500 | 16px | normal |

### Rules

- **Tighter tracking as size grows.** Display never sits at default tracking.
- Body stays at default tracking; don’t go below ~14–15px for readable copy.
- Prefer **medium (500)** over bold for headlines — confidence without shout.
- Strikethrough prices use Graphite at reduced optical weight; live price stays Ink/large.

---

## 5. Layout & spacing

### Structure

| Element | Measure |
| --- | --- |
| Content column (`.guides`) | ~1376px |
| Header row | ~1280 × 56px, radius 8px |
| Section top padding | ~136px (bento, walk, brands, pricing, faq) |
| Editorial sections | ~160px vertical + 64px horizontal |
| Bento / plan cell pad | 32–36px × 64px |
| Module max | 1400px (`--vessa-mod-max`) |

### Spacing tokens

| Token | Value | Use |
| --- | --- | --- |
| `--vessa-gap-group` | 24px | Group separation |
| `--vessa-gap-field` | 16px | Form fields |
| `--vessa-gap-label` | 8px | Label → control |
| `--vessa-gap-row` | 8px | Dense rows |
| `--vessa-row-pad` | 12px | Row padding |
| `--vessa-mod-body-pad` | 24px | Module body |
| `--vessa-mod-card-pad` | 16px | Cards |
| `--vessa-mod-cell-pad` | 12px | Grid cells |

### Grid language

- **Bento cells** divided by **dashed hairlines**, not solid cards with shadows.
- Dash recipe: 9px on / 6px off, color `#A2A3A5`, via repeating linear gradients (horizontal + vertical).
- Two-up plans and feature cells share the same dashed module chrome.
- Full-bleed stages (walkthrough, close) break out of the 1376 column; copy still aligns to it.

### Mobile (~390px)

- Single column; hero headline stacks tightly.
- Header collapses; primary CTA remains reachable.
- Preserve Paper background and Accent CTA — don’t introduce a mobile-only palette.

---

## 6. Components

### Primary CTA (`.cta.is-accent`)

- Background: Ultramarine `#1F2DE6`
- Text: white, 14px / 500
- Height: 40px (header) · padding `0 16px` · radius **8px**
- Signature: **pixel dither band** (SVG `cta-dither`) animates across the fill — motion as brand, not decoration noise
- Hover: short color transition (~0.2s), no scale bounce
- Inverted variant (`.cta.is-inverted`): white fill, Ultramarine text — used on dark stages

### Header

- Fixed; row ~1280×56, radius 8px
- At rest: transparent over Paper
- On scroll / emphasis: fills with Accent at ~94% opacity, light nav links
- Nav links: 14px / 500 / Graphite (or faint on accent bar)
- Wordmark left; CTA right

### Tabs / chips (how-stage)

- 14px / 500, pad `8px 14px`, radius 8px
- Inactive: Ink faint `#676D78`
- Active: Ink `#101216`
- Pill track behind demos uses muted `#E5E8EC`, fully rounded

### MCP / tool chips

- Pad ~`9px 14px`, radius 8px
- 1px solid dash-border grey, Paper fill
- Quiet list of partners — equal visual weight

### Forms

- Control height: 36px default (`--vessa-ctrl-h`); sm 26 / lg 40 / xs 20
- Control radius: 8px (sm 6 / xs 4)
- Field border: `#B2B8C2`
- Primary submit mirrors Accent button (e.g. “Keep me posted”)

### Pricing plans

- Two equal cells in a dashed module
- Featured plan uses the same chrome — emphasis via typography and badge (“Launch offer”), not a different card elevation
- Price: large Ink; struck old price: Graphite ~31px
- Checklist items: plain body, no icon spam

### FAQ

- Accordion rows, generous vertical pad (~22px)
- Question at 16px Ink; answer Graphite
- Inline doc links in **Accent**, no underline

### Color swatch UI

- Name + hex + “Copied” feedback
- One click copies hex — this interaction is part of the brand story

---

## 7. Motion

### Philosophy

Move like a decision: **hard off the line, then still.** Nothing idle-drifts. Contrast between stillness and motion is the signature.

### Easing tokens

| Token | Curve | Feel |
| --- | --- | --- |
| `--vessa-ease-ui` / micro / expand / collapse / drift | `cubic-bezier(.3, .9, .1, 1)` | Soft overshoot settle — default UI |
| `--vessa-ease-punch` | `cubic-bezier(.7, 0, .16, 1)` | Decisive entrances |
| Tailwind-ish in/out | standard `.4/0/.2/1` family | Generic fallbacks only |

### Duration tokens

| Token | Time | Use |
| --- | --- | --- |
| `--vessa-dur-micro` | 130ms | Toggles, micro-feedback |
| `--vessa-dur-collapse` | 160ms | Closing |
| `--vessa-dur-push-out` | 170ms | Exit push |
| `--vessa-dur-ui` | 190ms | Default UI |
| `--vessa-dur-expand` | 200ms | Opening |
| `--vessa-dur-push-in` | 220ms | Enter push |
| CTA color transition | ~200ms | Hover / active |

### Rules

- Prefer the **lower end** of duration bands.
- Anything slower than ~1s is a set piece (walkthrough), not a default control.
- Staggers stay tight — one gesture with texture, not a queue.
- Smooth page scroll via Lenis; respect reduced-motion where appropriate.
- Signature flourishes: **dither trail** on pointer, **CTA dither band**, demo stages that actually animate easing curves.

---

## 8. Imagery & texture

- **Dither / bitmap grain** as a brand texture (cursor trail, CTA band, top glow fields) — technical, not skeuomorphic.
- Product shots sit inside dashed modules or soft stages (`#F6F7F9`), often with device chrome.
- Brand example posters (VANTA, Pythia) are full-bleed photographic cards with short captions — proof that client brands don’t inherit Vessa’s look.
- Prefer real UI captures over illustrated metaphors.
- Theme color / OG surfaces stay on Paper `#EEF0F3`.

---

## 9. Page architecture (homepage)

Use this rhythm when composing long marketing pages:

1. **Hero** — outcome headline, one paragraph, Accent CTA, quiet social proof
2. **How / product stage** — interactive tabs through guideline sections
3. **Stakes** — large editorial prose; final line in Accent
4. **Bento** — feature cells with live mini-demos (MCP, motion values, copy-hex, privacy)
5. **Walkthrough** — video / set piece
6. **Examples** — two live brands that deliberately don’t look like Vessa
7. **Beyond** — external precedent (Cash App, Dropbox) as cultural proof
8. **Pricing** — one-time, transparent; building free
9. **FAQ** — blunt answers + deep links
10. **Close** — short imperative on dark/accent stage + inverted CTA
11. **Footer** — product, compare, guides, docs, legal; operator line

---

## 10. Implementation checklist

When building a screen “in the Vessa register”:

- [ ] Paper `#EEF0F3` page ground; Ink / Graphite type; single Accent `#1F2DE6`
- [ ] Switzer (or agreed substitute) with negative tracking on display sizes
- [ ] Radius 8px on controls and header chrome; 4–6px only for tiny controls
- [ ] Dashed 9/6 hairlines for module structure — not drop shadows
- [ ] Primary CTA = Accent fill + optional dither; no gradient buttons
- [ ] Motion ≤ ~220ms for UI; punch/overshoot ease; no perpetual float
- [ ] Copy is direct, specific, and scarce with exclamation marks
- [ ] Interactive values (colors, eases) are visible and copyable where relevant
- [ ] Desktop content ~1280–1376px; mobile single column without a second palette

---

## 11. Token quick reference (CSS)

```css
:root {
  /* Color */
  --v-ink: #101216;
  --v-ink-soft: #3f434b;
  --v-ink-faint: #676d78;
  --v-surface: #eef0f3;       /* Paper */
  --v-bg: #f6f7f9;
  --v-surface-2: #e5e8ec;
  --v-accent: #1f2de6;
  --v-on-accent: #fff;
  --v-hairline: #d3d7de;
  --m-border: #a2a3a5;

  /* Dash */
  --m-dash-on: 9px;
  --m-dash-off: 6px;

  /* Type */
  --v-font-display: "Switzer", ui-sans-serif, system-ui, sans-serif;
  --v-font-text: "Switzer", ui-sans-serif, system-ui, sans-serif;

  /* Radius */
  --vessa-radius-control: 8px;
  --vessa-radius-card: 8px;
  --vessa-radius-small: 6px;
  --vessa-radius-tiny: 4px;
  --vessa-radius-dialog: 12px;

  /* Motion */
  --vessa-ease-ui: cubic-bezier(.3, .9, .1, 1);
  --vessa-ease-punch: cubic-bezier(.7, 0, .16, 1);
  --vessa-dur-micro: .13s;
  --vessa-dur-ui: .19s;
  --vessa-dur-push-in: .22s;
}
```

---

*Tokens reflect computed CSS on the live marketing homepage; refine against product UI if editor surfaces diverge.*
