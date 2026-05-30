# Meal Planner — "Sage & Gold" Visual Redesign

**Date:** 2026-05-29
**Status:** Approved (design locked via visual brainstorming)
**Scope:** Full visual redesign of the existing v0.1.0 app. Behavior, data flow, rule
engine, and module boundaries are **unchanged** — this is a look-and-feel replacement of
the design system and the markup/CSS/icons that express it.

---

## 1. Overview & intent

Replace the light "Fresh Kitchen" identity (pine/mint/coral on paper) with **Sage &
Gold**: a dark, premium, restaurant-grade theme. Muted sage-green ground, antique-gold
accent, cream type, elegant serif headings, refined duotone icons. The mood is
"grown-up home cook / elegant bistro," reached by iterating on the user's two reference
decks (warm-earth, then forest-green-and-gold) and muting the green to sage.

This is a **dark theme by default.** A light variant is explicitly out of scope for this
pass (possible future follow-up); we will **not** auto-switch on `prefers-color-scheme`.

### What does NOT change
- The Sheet-as-source-of-truth data flow, generator rules, shopping logic, store/Firebase
  sync, PWA offline shell, and the Plan · Shopping · Meals structure.
- Module boundaries (`src/*.js`). Only `icons.js` and `render.js` change markup; `index.html`
  changes CSS/markup; the rest are untouched.
- The four rules, eat-out/cook/healthy semantics (only their *colors* change).

---

## 2. Color

Dark theme. Tokens are renamed to be semantic (the old `--pine`/`--coral`/`--mint` names
would be misleading). All token usage lives in `index.html`'s `<style>`, so the rename is
contained there; `render.js` keys off CSS *classes*, not variables.

| Token | Hex | Role |
| :-- | :-- | :-- |
| `--bg` | `#2F382F` | App background (bottom of the gradient). |
| `--bg-2` | `#3B453D` | Background gradient top; muted sage. |
| `--surface` | `rgba(255,255,255,.05)` | Default card / row fill (translucent on the ground). |
| `--surface-line` | `rgba(198,161,76,.15)` | Card / hairline border (faint gold). |
| `--gold` | `#C6A14C` | Primary accent: active state, icons-active, headings highlight, eat-out. |
| `--gold-2` | `#B58C38` | Gold gradient end (buttons, badges). |
| `--gold-hi` | `#D9B863` | **Text** gold — brighter, for small gold labels/pills on dark (contrast). |
| `--gold-soft` | `rgba(198,161,76,.16)` | Gold wash: eat-out card fill, deal/gold pills. |
| `--cream` | `#ECE7D9` | Primary text & meal names. |
| `--cream-muted` | `#9FA89B` | Secondary text, day labels, meta, inactive tabs (sage-gray). |
| `--sage-leaf` | `#BDCB9E` | Healthy accent (icon + pill text), distinct from gold. |
| `--sage-leaf-bg` | `rgba(169,185,140,.18)` | Healthy pill fill. |
| `--ink-on-gold` | `#2A2616` | Text/icon on gold fills (buttons, eat-out badge). |

**Decorative:** a soft **radial gold glow** (`radial-gradient(circle, rgba(198,161,76,.13),
transparent 70%)`) anchored top-right behind the header — the "organic arc" from the
reference. One per screen, low opacity, non-interactive.

**Usage rules**
- **Gold is the single accent** — used sparingly: active tab, primary CTA, eat-out, deals,
  the one highlighted heading word. If gold appears more than ~twice per screen-area,
  reconsider.
- **Eat-out = gold, cook-at-home = neutral** (cream/gold-outline). **Healthy = sage-leaf.**
  Distinction stays learnable at a glance and is never color-only (see §8).
- Body/meal text is always `--cream`; never below `--cream-muted` for readable text.
- For **small gold text** (pill labels, eat-out day label) use `--gold-hi`, not `--gold`,
  to hold contrast on the dark ground.

---

## 3. Typography

Switch from the system stack to **two self-hosted web fonts** with system fallbacks.

| Style | Family | Size (mobile) | Weight | Notes |
| :-- | :-- | :-- | :-- | :-- |
| Kicker (e.g. "YOUR WEEK") | Inter | 0.56rem / ~9px | 600 | Uppercase, `letter-spacing:.3em`, `--gold`. Optional, above title. |
| Screen title ("This Week") | Playfair Display | 2rem / 32px | 700 | One word wrapped in `<em>` rendered `--gold` italic. |
| Card meal name | Playfair Display | 1rem / 16px | 700 | The day card's primary content, `--cream`. |
| Day label (MON · EAT OUT) | Inter | 0.56rem / ~9px | 600 | Uppercase, `letter-spacing:.14em`. |
| Pills / badges / tabs | Inter | 0.56–0.63rem | 600 | |
| Body / meta / shopping | Inter | 0.7–0.9rem | 400–600 | |

**Why web fonts now:** the elegant serif is core to the chosen identity; the system stack
can't deliver it. This reverses the prior "no font download" principle deliberately.

**Hosting (decided):** **self-host** woff2 in `/fonts`, not Google Fonts CDN — required so
the offline PWA shell keeps its type and so GitHub Pages has no third-party dependency.
- Files: `Inter` 400/500/600 and `Playfair Display` 700 + 700-italic, **latin subset**, woff2.
- `@font-face` with `font-display: swap`. Fallbacks: Playfair → `Georgia, "Times New Roman",
  serif`; Inter → `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.
- **Precache the woff2 files in `sw.js`** (bump cache version) so they're available offline.
- Budget: ≤ ~5 woff2 files, latin-only, to keep first paint fast.

---

## 4. Spacing, radius & elevation

Mostly inherited; tuned for dark.
- **Spacing scale (4px base):** `4 · 8 · 12 · 16 · 24 · 32`.
- **Radius:** cards `18px` · badges `9px` (rounded square) · pills/buttons `999px` ·
  phone-edge feel `34–36px`.
- **Elevation:** shadows are darker and softer on the dark ground
  (`0 8px 20px rgba(0,0,0,.28)` for raised gold elements; cards rely on the translucent
  fill + faint gold border rather than heavy shadow). No hard black drop shadows.

---

## 5. Core components

### Header
Optional gold **kicker** (uppercase, tracked) → **serif title** with one word in gold
italic (e.g. *This **Week***) → uppercase `--cream-muted` subtitle. The radial gold glow
sits behind it.

### Day card (centerpiece) — "Badge" pattern (replaces the left accent-bar)
A translucent rounded card. Top-left **34px rounded-square badge**; the rest:
day label → meal name (serif) → pill row → circular re-roll button (bottom-right).
- **Cook at home:** `--surface` fill, `--surface-line` border; badge = **gold-outline**
  with a **cooking-pot** duotone icon; day label `--cream-muted`.
- **Eat out:** `--gold-soft` fill, gold border; badge = **gold-gradient** with a **star**
  duotone icon; day label `--gold-hi`; label text appends `· EAT OUT`.
- **Locked:** a gold-outline ring (replaces the old `--mint-bg` outline).

### Pills (icon + label, full-radius)
- **Category** — `--surface` fill, `--cream` text.
- **Healthy** — `--sage-leaf-bg` fill, `--sage-leaf` text + leaf icon.
- **Deal** — `--gold-soft` fill, `--gold-hi` text + tag icon (eat-out only).

### Buttons
- **Primary** ("Generate week") — **gold gradient** (`--gold`→`--gold-2`) fill,
  `--ink-on-gold` text, full radius, soft gold shadow.
- **Soft / secondary** ("Re-roll unlocked") — transparent fill, gold-outline, `--gold-hi` text.
- **Swap (icon)** — 29–30px circle, transparent, gold-outline border, gold refresh icon.

### Bottom tab bar
Translucent dark bar (`rgba(18,22,18,.4)`), faint gold top border. Three tabs: **Plan
(calendar) · Shopping (bag) · Meals (fork+knife)**. Active = `--gold` icon + label;
inactive = `--cream-muted`.

### Shopping & Meals
- **Aisle headers:** uppercase tracked `--cream-muted`.
- **Shopping row:** translucent `--surface`, checkbox + ingredient + source meals; checked
  → strikethrough + `--cream-muted`; staple marker pill (gold-soft).
- **Meal row:** translucent `--surface`, name (`--cream`) + ingredients (`--cream-muted`).
- **Banners:** info = `--sage-leaf-bg`/`--sage-leaf`; warn = `--gold-soft`/`--gold-hi`.

---

## 6. Iconography

**Refined duotone, inline SVG** (treatment "C"): `stroke-width: 1.5`, round caps/joins,
plus a same-color **fill at ~16% opacity**. Recolor via `currentColor` so an icon takes
its surrounding text color (gold when active, cream/sage otherwise).

Set changes in `src/icons.js`:
- **`cart` → `bag`** (shopping bag — more elegant).
- **`utensils` → fork + knife** (refined two-stroke, replaces the single-fork glyph).
- **Add `pot`** (cook-at-home badge) and **`star`** (eat-out badge).
- **Keep** `calendar`, `refresh`, `leaf`, `tag`, `lock` — re-tuned to 1.5 stroke / .16 fill.
- Standard size 22–23px (nav), ~15px (swap), ~12px (inline pill).

---

## 7. Motion
Unchanged: restrained, `120–160ms ease`; card re-roll = brief fade + ~4px lift; instant
tab swaps; honor `prefers-reduced-motion` by dropping transforms.

---

## 8. Accessibility (dark-theme specific)
- **Contrast:** `--cream` on `--bg` is high-contrast (passes AA comfortably). For small
  gold text use `--gold-hi` (not `--gold`). Verify all body/label pairs ≥ 4.5:1 and
  large/secondary ≥ 3:1 during build; nudge tokens lighter if any pair fails.
- **Color is never the only signal:** eat-out also says `· EAT OUT` + star badge; healthy
  has leaf + label; deals have tag + text; cook vs eat-out also differ by badge shape/fill.
- Keyboard focus: visible **gold** focus ring on all interactive elements.
- `theme-color` meta and `manifest.webmanifest` `theme_color`/`background_color` update to
  the sage/gold ground. App icons (`icon-192/512.png`) regenerated as a gold mark on sage
  (follow-up; not blocking).

---

## 9. Implementation / migration map

| File | Change |
| :-- | :-- |
| `index.html` | Rewrite `:root` tokens (§2); body background = sage gradient + radial gold glow; restyle every component (§5); **remove the `.card.cook/.eatout::before` left-edge pseudo-element** (replaced by the badge); `theme-color` meta → `#2F382F`; add `@font-face` block (§3); add optional kicker markup + wrap one title word in `<em>`. |
| `src/icons.js` | `cart`→`bag`, refined `utensils` (fork+knife), add `pot` + `star`; retune all to 1.5 stroke / .16 fill; keep `currentColor`. |
| `src/render.js` | Day card markup: add the badge element (pot for cook / star for eat-out); the existing `cook`/`eatout` classes now drive fill/border/badge instead of a left edge; ensure healthy/deal/category pills carry their icons; eat-out day label appends `· EAT OUT`. Tab labels map to new icon keys (`bag`, fork+knife `utensils`). |
| `manifest.webmanifest` | `theme_color`/`background_color` → sage/gold. |
| `sw.js` | Precache the woff2 font files + any new assets; bump cache version string. |
| `icon-192.png`, `icon-512.png` | Regenerate (gold mark on sage) — follow-up, optional. |
| `tests/render.test.js` | Update assertions affected by markup changes (badge presence, label text, class names). Keep all other tests green. |
| `DESIGN-SYSTEM.md` | Rewrite to document Sage & Gold as the current system (supersedes Fresh Kitchen). |
| `/fonts/*.woff2` | New: self-hosted subset fonts. |

**Verification:** `npm test` stays green (logic untouched; only render assertions adjusted);
manual QA on a phone-width viewport against the approved mockup
(`.superpowers/brainstorm/.../sage-gold-final.html`); confirm offline shell still renders
with fonts after a service-worker update.

---

## 10. Out of scope (YAGNI)
- Light/auto theme. Food photography or per-category illustrations. Animated gradients.
  New screens or features. Any change to generator rules or data model.
