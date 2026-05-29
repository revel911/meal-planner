# 🎨 Family Dinner Planner — Design System

**Direction:** *Fresh Kitchen, modernized.* Wholesome and home-cooked at heart, but
clean, airy, and contemporary. Family · modern · fun — friendly without being childish.

This document is the single reference for how the app looks and feels. When in doubt,
favor whitespace, rounded softness, and one clear accent.

---

## 1. Color

The palette is small on purpose: one brand green, a soft mint, a warm coral accent, a
clean paper background, and a near-black ink for text.

| Token | Hex | Role |
| :-- | :-- | :-- |
| `--pine` | `#1F6E54` | Primary brand. Buttons, active states, day-card accent edge, headings-as-accent. |
| `--mint` | `#6FD3A6` | Secondary / decorative green. Icons, subtle highlights. |
| `--mint-bg` | `#E3F5EC` | Soft green wash. Healthy badge background, pill fills, selected rows. |
| `--paper` | `#FAF8F3` | App background. Warm off-white — cleaner than cream, friendlier than pure white. |
| `--surface` | `#FFFFFF` | Cards, sheets, tab bar. |
| `--coral` | `#FF7A5C` | Accent / "eat out". Eat-out card edge, deal pills, accent moments. Use sparingly. |
| `--coral-bg` | `#FFE7DF` | Soft coral wash. Deal pill background. |
| `--ink` | `#1B2D26` | Primary text. A green-tinted near-black, not pure `#000`. |
| `--muted` | `#7C8B83` | Secondary text, day labels, meta. |
| `--peach` | `#FCEBE2` | Neutral-warm pill background for category tags. |
| `--peach-tx` | `#C65A3A` | Category pill text. |
| `--line` | `#EFE9DD` | Hairline borders, dividers, tab-bar top border. |

**Usage rules**
- **Pine is the workhorse**; coral is the spice. If coral appears more than ~once per
  screen-area, reconsider.
- **Eat-out = coral, cook-at-home = pine.** This pairing is consistent everywhere (card
  edges, date treatment, badges) so the distinction is learnable at a glance.
- **Healthy = mint green.** Always paired with the leaf icon and `--mint-bg`.
- Text is always `--ink` on light, `--paper`/white on pine/coral. Never gray body text
  on white below `--muted`.

---

## 2. Typography

System font stack — fast, native-feeling, no web-font download:

```css
font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
```

| Style | Size (mobile) | Weight | Notes |
| :-- | :-- | :-- | :-- |
| Screen title (e.g. "This Week") | 1.5rem / 24px | 800 | `letter-spacing: -0.01em`. |
| Card meal name | 1rem / 16px | 700 | The primary content of a day card. |
| Day label (MON · EAT OUT) | 0.64rem / ~10px | 800 | Uppercase, `letter-spacing: 0.12em`, `--muted`. |
| Pills / badges | 0.63rem | 700 | Uppercase optional; keep short. |
| Body / meta | 0.7–0.8rem | 600 | `--muted`. |
| Tab label | 0.62rem | 700 | Under each tab icon. |

Tighten letter-spacing slightly on big bold headings; loosen it on small uppercase labels.

---

## 3. Spacing, radius & elevation

- **Spacing scale (4px base):** `4 · 8 · 12 · 16 · 24 · 32`. Use multiples; don't freestyle pixels.
- **Screen padding:** 16px horizontal on mobile.
- **Radius:** cards `18px` · pills/buttons `999px` (full) · date/icon chips `14px` · phone-edge feel `26–36px`.
- **Elevation (soft, green-tinted shadows):**
  - Card rest: `0 4px 14px rgba(27,45,38,.06)`
  - Raised / sheet: `0 14px 36px rgba(27,45,38,.16)`
  - Never hard black drop shadows — they break the friendly feel.

---

## 4. Core components

### Day card (the centerpiece) — "Accent bar" pattern
A white, 18px-rounded card with a **5px colored left edge**: **pine** for cook-at-home,
**coral** for eat-out. Contents top-to-bottom: day label (uppercase, muted; appends
`· EAT OUT` on eat-out days) → meal name (bold ink) → a row of pills + a circular swap button.

```
┌─▏ MONDAY ───────────────────────┐   ← pine left edge
│   Chicken Tikka Masala          │
│   [Indian]                  (⟳) │
└─────────────────────────────────┘

┌─▏ TUESDAY · EAT OUT ────────────┐   ← coral left edge
│   Tacos al Pastor               │
│   [Mexican] [🏷 Taco Tue]   (⟳) │
└─────────────────────────────────┘
```

### Pills
Small, full-radius, icon + label. Variants:
- **Category** — `--peach` bg / `--peach-tx` text (e.g. *Indian*, *American*).
- **Healthy** — `--mint-bg` bg / `--pine` text + leaf icon.
- **Deal** — `--coral-bg` bg / `--coral` text + tag icon (eat-out nights only).

### Buttons
- **Primary** — pine fill, white text, full radius (e.g. *Generate week*).
- **Soft / secondary** — `--mint-bg` fill, pine text (e.g. *Re-roll*).
- **Swap (icon)** — 30px circle, white fill, `--line` border, pine refresh icon. Lives at
  the right end of a day card's pill row.

### Bottom tab bar
White, top hairline border, three tabs: **Plan · Shopping · Meals**. Active tab = pine
icon + label; inactive = muted. Icon above label. Fixed to the bottom on mobile.

### Shopping list row
Checkbox + ingredient + (optional) qty/source meal. Grouped under aisle headers
(**Produce · Meat & Seafood · Pantry · Dairy · Other**). Checked items dim with a
strikethrough; staples show a small "staple" marker so it's clear why they stay checked.

---

## 5. Iconography

**Soft duotone, inline SVG.** Each icon is a rounded-cap line drawing (`stroke-width: 1.9`,
`stroke-linecap/linejoin: round`) over a soft tinted fill of the same color at ~18% opacity.
Recolor via `currentColor`. No emoji in the UI.

Implementation: two classes inside each `<svg>` — `.fill` (the tinted shape,
`fill: currentColor; opacity: .18`) and `.stroke` (the outline, `fill: none; stroke:
currentColor`).

Core set: **calendar** (Plan) · **cart** (Shopping) · **utensils** (Meals) · **refresh**
(swap / re-roll) · **leaf** (healthy) · **tag** (deal). Standard size 22px (nav) / 15px (inline in pills).

---

## 6. Motion

Restrained and quick. Transitions `120–160ms ease`. Card swap / re-roll: a brief fade +
~4px lift. Tab change: instant content swap. No bouncing, no parallax. Respect
`prefers-reduced-motion` by dropping transforms.

---

## 7. Responsive behavior

**Mobile-first.** The base layout is a single scrolling column of day cards with a fixed
bottom tab bar — designed for one-thumb use.

| Breakpoint | Layout |
| :-- | :-- |
| `< 600px` (phone, primary) | Single column. Fixed bottom tab bar. Full-width cards. |
| `600–960px` (tablet) | Two columns of day cards; tab bar may move inline / top. Wider shopping list. |
| `> 960px` (desktop) | Centered max-width (~720–840px) column, or 2–3 card columns; generous margins. The app never sprawls edge-to-edge on big screens. |

Touch targets ≥ 44px. The accent-bar day card scales by widening, never by redesigning.

---

## 8. Accessibility

- Color is never the *only* signal: eat-out also says "· EAT OUT", healthy has a leaf +
  label, deals have a tag + text.
- Maintain ≥ 4.5:1 contrast for body text (ink on paper/white passes comfortably).
- All interactive elements keyboard-focusable with a visible pine focus ring.
- Honor `prefers-reduced-motion` and `prefers-color-scheme` (a dark variant is a future
  roadmap item, not v1).
