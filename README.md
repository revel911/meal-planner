# 🥗 Family Dinner Planner

A mobile-first web app that turns the dinner ideas in our shared Google Sheet into a
planned, rule-respecting **Monday–Sunday** week — with a grocery list we can check off
against what's already in the kitchen.

Built for one household (me + my wife), on our phones, sharing one plan.

> 📄 New here? Start with [VISION.md](VISION.md) for the *why*, then
> [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) for the *look*, and [ROADMAP.md](ROADMAP.md) for
> *what's next*.

---

## What it does

- 📖 **Reads our meals live** from the shared Google Sheet — the Sheet stays the single
  source of truth.
- 🎲 **Auto-generates a week** that obeys our four rules, then lets us tweak any day and
  pivot mid-week.
- 🍽️ **Suggests restaurant deals** on eat-out nights (Taco Tuesday, wing night, …).
- 🛒 **Builds a grouped shopping list** with checkboxes for what we already have.
- 🔄 **Syncs** between both our phones in real time.

### The four rules

1. **No repeats from last week.**
2. **At most two eat-out nights** per week.
3. **No food category twice** in the same week.
4. **A healthy-meal target** (default ≥ 3/week, adjustable), with a 💚 badge.

If the meal list can't satisfy every rule, the app relaxes the lowest-priority one and
tells us which — it never fails silently. See [ROADMAP.md](ROADMAP.md) for rule details.

---

## How it works

```
Google Sheet (published CSV)
        │  meals + deals, read-only
        ▼
   index.html  ──►  rule-respecting week generator  ──►  Plan / Shopping / Meals screens
        │                                                        │
        └──────────────►  Firebase Realtime DB  ◄───────────────┘
                  (current plan · pantry staples · week history, synced both phones)
```

- **Single-file app:** `index.html` (HTML/CSS/JS, no build step), hosted on **GitHub Pages**.
- **Data:** the shared Google Sheet, published to the web as read-only CSV.
- **Sync/state:** **Firebase Realtime Database**, path-scoped (same pattern as the
  health-tracker).

> ℹ️ **Status:** documentation and design are complete; the app itself is not built yet.
> Implementation starts at **Phase 0** in [ROADMAP.md](ROADMAP.md).

---

## The data model (the Google Sheet)

The Sheet has two tabs. The app only ever **reads** them.

**Meals**

| Column | Meaning |
| :-- | :-- |
| Meal | Dish name (e.g. *Sheet Pan Salmon*) |
| Category | Cuisine/type (Italian, Mexican, American…) — used for the no-duplicate rule |
| Ingredients | Comma-separated; feeds the shopping list |
| Where | `Home` (must cook) · `Either` (cook or eat out) · `Eat Out` (must eat out) |
| Healthy | `Yes` / `No` — feeds the healthy target + 💚 badge |
| Notes | Free text (optional) |

**Restaurant deals by day**

| Column | Meaning |
| :-- | :-- |
| Day | Monday–Sunday |
| Restaurant | Where the deal is |
| Deal | The offer (e.g. *Taco Tuesday*) |
| Notes | Free text (optional) |

To add or change a meal, edit the Sheet — the app reflects it on the next load.

---

## Screens

Bottom tab bar with three tabs:

- **Plan** — the Monday–Sunday week as Accent-bar day cards (pine edge = cook at home,
  coral edge = eat out). Swap or override any day.
- **Shopping** — ingredients from the week, deduped and grouped by aisle, with "already
  have" checkboxes (staples persist, perishables reset).
- **Meals** — browse the full meal list from the Sheet (read-only reference).

See [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) for the full visual language.

---

## Setup *(once the app is built — see roadmap)*

1. **Publish the Sheet:** in Google Sheets → *File → Share → Publish to web* (read-only),
   for both tabs.
2. **Create a Firebase project** with a Realtime Database; copy the web config into
   `index.html`.
3. **Deploy** `index.html` to GitHub Pages.
4. **Add to home screen** on each phone for an app-like launch.

Exact config steps will be finalized during Phase 0/5 and captured here.

---

## Documentation

| Doc | What's in it |
| :-- | :-- |
| [VISION.md](VISION.md) | Why this exists, who it's for, principles, non-goals |
| [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) | Color, type, components, icons, responsive rules |
| [ROADMAP.md](ROADMAP.md) | Phased plan from scaffold to shipped MVP, plus later ideas |
| [CHANGELOG.md](CHANGELOG.md) | What's shipped and the decisions behind it |

---

## Tech

Plain HTML/CSS/JS · Google Sheets (published CSV) · Firebase Realtime Database ·
GitHub Pages. No framework, no build step, no server to maintain.
