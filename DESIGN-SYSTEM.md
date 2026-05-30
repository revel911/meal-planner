# 🎨 Family Dinner Planner — Design System

**Direction:** *Sage & Gold.* A dark, premium, elegant-bistro look — muted sage-green
grounds, antique-gold accents, cream type, refined serif headings, and dark-glass panels.
Calm and grown-up, but still warm and food-forward. (Supersedes the earlier light
"Fresh Kitchen" system.)

This document is the single reference for how the app looks and feels. Values here are
**as-built** — they reflect the shipped CSS in [`index.html`](index.html). When in doubt,
favor restraint: dark glass, one gold accent, generous space.

---

## 1. Color

Dark theme. A muted sage ground, a single antique-gold accent, cream text, and a sage-leaf
green reserved for "healthy". Surfaces are translucent **dark** glass so any light text on
them keeps strong contrast.

| Token | Value | Role |
| :-- | :-- | :-- |
| `--bg` | `#2F382F` | App background (bottom of the gradient). |
| `--bg-2` | `#3B453D` | Background gradient top — muted sage. |
| `--surface` | `rgba(0,0,0,.18)` | Cards, rows, neutral pills — dark glass over the ground. |
| `--surface-line` | `rgba(198,161,76,.18)` | Hairline gold borders on surfaces. |
| `--gold` | `#C6A14C` | Primary accent: active states, CTA, eat-out, title highlight, icons-active. |
| `--gold-2` | `#B58C38` | Gold gradient end (buttons, eat-out badge). |
| `--gold-hi` | `#D9B863` | **Text** gold — brighter, for small gold labels/pills on dark (contrast). |
| `--gold-soft` | `rgba(198,161,76,.16)` | Gold wash for deal/staple pill fills. |
| `--cream` | `#ECE7D9` | Primary text & meal names. |
| `--cream-muted` | `#A8B2A4` | Secondary text: day labels, meta, subtitles, inactive tabs (sage-gray). |
| `--sage-leaf` | `#BDCB9E` | Healthy accent (icon + pill text + info-banner text). |
| `--sage-leaf-bg` | `rgba(169,185,140,.18)` | Healthy pill fill. |
| `--ink-on-gold` | `#2A2616` | Text/icon on gold fills (primary button, eat-out badge). |
| `--line` | `rgba(236,231,217,.12)` | Faint cream divider (rarely used). |

**Decorative:** a soft **radial gold glow** (`rgba(198,161,76,.13)` → transparent) is fixed
behind the top-right of the header — the "organic arc" cue. One per view, low opacity,
`pointer-events:none`.

**Usage rules**
- **Gold is the only accent, used sparingly:** active tab, primary CTA, eat-out, deals, the
  one highlighted heading word. More than ~twice per screen-area → reconsider.
- **Eat-out = gold, cook-at-home = neutral, healthy = sage-leaf.** Learnable at a glance and
  never color-only (see §8).
- **Small gold text uses `--gold-hi`, not `--gold`** — `--gold` fails AA on the lighter end
  of the ground at small sizes; `--gold-hi` clears it.
- Light text on a translucent surface always rides **dark** glass (`--surface`), never a
  light wash — that's what keeps it ≥ 4.5:1.

---

## 2. Typography

Two **self-hosted** web fonts (woff2, latin subset, `font-display:swap`, precached by the
service worker so the offline PWA keeps its type — see [`sw.js`](sw.js)). No CDN.

- **Serif (display):** `Playfair Display` 700 + 700 italic. Fallback: `Georgia, "Times New Roman", serif`.
- **Sans (UI/body):** `Inter` 400 / 500 / 600 / 700. Fallback: `system-ui, -apple-system, "Segoe UI", Roboto, …`.

| Style | Family | Size (mobile) | Weight | Notes |
| :-- | :-- | :-- | :-- | :-- |
| Kicker (e.g. "YOUR WEEK") | Inter | 0.56rem | 600 | Uppercase, `letter-spacing:.3em`, `--gold-hi`. |
| Screen title ("This *Week*") | Playfair Display | 2rem | 700 | One word in `<em>` → `--gold` italic. |
| Card meal name | Playfair Display | 1rem | 700 | `--cream`. |
| Day label (MON · EAT OUT) | Inter | 0.56rem | 600 | Uppercase, `letter-spacing:.14em`. |
| Pills / tabs / badges | Inter | 0.6rem | 600 | |
| Body / meta / shopping | Inter | 0.7–0.9rem | 400–700 | |

---

## 3. Spacing, radius & elevation

- **Spacing scale (4px base):** `4 · 8 · 12 · 16 · 24 · 32`.
- **Radius:** cards `18px` (`--r-card`) · badges `9px` (rounded square) · pills/buttons `999px` · chips/inputs `14px` (`--r-chip`).
- **Elevation:** dark theme leans on the translucent fill + faint gold border for
  separation, not heavy shadow. Gold elements get a soft glow
  (`0 8px 20px rgba(181,140,56,.3)`). Shadow tokens: `--shadow-rest 0 4px 14px rgba(0,0,0,.22)`,
  `--shadow-raise 0 14px 36px rgba(0,0,0,.34)`.

---

## 4. Core components

### Header
Optional gold **kicker** (uppercase, tracked, `--gold-hi`) → **serif title** with one word
in gold italic (`This <em>Week</em>`) → uppercase `--cream-muted` subtitle. Radial gold
glow sits behind.

### Day card (centerpiece) — "Badge" pattern
A dark-glass card (`--surface`, 1px `--surface-line` border, 18px radius). Top-left **34px
rounded-square badge**; then day label → serif meal name → pill row → circular re-roll
button (right). Lock toggle alongside.
- **Cook at home:** neutral dark-glass card; badge = **gold-outline** with a **pot** icon;
  day label `--cream-muted`.
- **Eat out:** faint gold-tinted card (`rgba(198,161,76,.07)`) with a **gold** border
  (`rgba(198,161,76,.45)`); badge = **gold-gradient** with a **star** icon; day label
  `--gold-hi`; label text appends `· EAT OUT`.
- **Locked:** gold border + inset gold ring.

### Pills (icon + label, full-radius)
- **Category / Where** — `--surface` fill, `--cream` text.
- **Healthy** — `--sage-leaf-bg` fill, `--sage-leaf` text + leaf icon.
- **Deal / Staple** — `--gold-soft` fill, `--gold-hi` text (+ tag icon for deals).

### Buttons
- **Primary** ("Generate week") — gold gradient (`--gold`→`--gold-2`), `--ink-on-gold` text, soft gold glow.
- **Soft** ("Re-roll unlocked") — transparent, gold-outline, `--gold-hi` text.
- **Swap (icon)** — 30px circle, transparent, gold-outline, gold refresh icon.
- **Lock (icon)** — bare; `--cream-muted`, turns `--gold` when on.

### Bottom tab bar
Dark frosted glass (`rgba(18,22,18,.72)` + `backdrop-filter:blur(8px)` with the
`-webkit-` prefix for iOS), faint gold top border. Tabs: **Plan (calendar) · Shopping (bag)
· Meals (fork+knife)**. Active = `--gold` icon + label; inactive = `--cream-muted`.

### Banners, shopping & meals
- **Banners:** dark-glass (`--surface`) with an accent border + accent text — info = sage
  (`--sage-leaf`), warn = gold (`--gold-hi`). (Dark glass, not a light wash, for AA.)
- **Shopping row:** dark-glass, gold-accent checkbox (`accent-color:var(--gold)`); checked →
  strikethrough + `--cream-muted`; gold staple pill.
- **Meal row:** dark-glass; name `--cream`, ingredients `--cream-muted` (meal-name resets
  the day-card left indent).
- **Override select:** dark field, `--surface-line` border, `--cream` text; warning text `--gold-hi`.

---

## 5. Iconography

**Refined duotone, inline SVG** (`src/icons.js`): `stroke-width:1.5`, round caps/joins, plus
a same-color **fill at ~16% opacity**. Recolor via `currentColor` (gold when active,
cream/sage otherwise). Set: **calendar · bag · utensils (fork+knife) · refresh · leaf · tag
· pot · star · lock**. Sizes ~22px (nav), ~20px (badge), ~16px (swap), ~14px (inline pill).

---

## 6. Motion
Restrained, `120–160ms ease`; card re-roll = brief fade + ~4px lift; instant tab swaps.
Honors `prefers-reduced-motion` by dropping transforms.

---

## 7. Responsive behavior
Mobile-first single column with a fixed bottom tab bar (one-thumb use). `≥600px`: two-column
day cards. `>960px`: centered ~720–840px column. Touch targets ≥ 44px.

---

## 8. Accessibility
- **Contrast (dark theme):** `--cream` on the ground/surfaces is ~10:1. The small-text pairs
  were tuned to clear **WCAG AA (4.5:1)** on the lighter end of the gradient: `--cream-muted`
  (~5:1), `--gold-hi` for small gold text (~5.2:1), and all panel surfaces use **dark** glass
  so light text never sits on a light wash. Use `--gold-hi` (not `--gold`) for small gold text.
- **Color is never the only signal:** eat-out also says `· EAT OUT` + star badge + gold
  border; cook has a pot badge; healthy has a leaf + label; deals have a tag + text.
- **Focus:** visible 2px **gold** focus ring (`:focus-visible`) on all interactive elements.
- Honors `prefers-reduced-motion`. The app ships **dark only** — a light/auto variant is a
  possible future follow-up, not currently implemented.
