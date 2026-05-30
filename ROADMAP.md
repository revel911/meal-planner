# 🗺️ Family Dinner Planner — Roadmap

How we get from "five design docs" to a dinner planner we actually use every week.
Phases are ordered by dependency and value. Anything not listed here is out of scope
until it earns a place (see [VISION.md](VISION.md) non-goals).

> **Convention:** when a roadmap item ships, it moves out of this file and into
> [CHANGELOG.md](CHANGELOG.md). This file only ever describes work *not yet done*.

---

## Shipped

Phases 0–5 (foundations, the generator, tweak & pivot, eat-out deals, shopping list,
polish & ship) all landed in **v0.1.0**. See [CHANGELOG.md](CHANGELOG.md) for the detail.

## Next up *(small follow-ups on the shipped MVP)*

- [ ] **Dedicated staples editor** — staples persist and stay checked today, but marking
      an arbitrary ingredient as a staple is only lightly exposed. Add a clear toggle/affordance.
- [ ] **Publish the Deals tab** in the Sheet so eat-out nights show restaurant/deal pills
      (the app already matches and renders them when the tab exists).
- [ ] **Two-device sync sanity check** on real phones now that Firebase is wired.

---

## Later / nice-to-have *(post-MVP, not committed)*

- [ ] **Leftovers / "cook once, eat twice"** — mark a meal to fill two days.
- [ ] **Servings & quantities** in the shopping list (needs a qty column in the Sheet).
- [ ] **History view** — browse past weeks. (The generator already *uses* recent history to
      fade repeats; this would be the UI to actually see it.)
- [ ] **Dark mode** (`prefers-color-scheme`).
- [ ] **Share/export** the shopping list (copy to clipboard / text to phone).
- [ ] **Per-day notes** ("defrost chicken", "kids at grandma's").
- [ ] **Seasonal weighting** in the generator (favorite weighting shipped via 👍/👎 ratings).

---

## Explicitly *not* on the roadmap

Recipe steps, nutrition/calorie computation, multi-household accounts, pantry stock
levels, native apps. See [VISION.md](VISION.md) for the reasoning.
