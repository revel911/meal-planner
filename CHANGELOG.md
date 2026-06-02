# 📓 Changelog

All notable changes to the Family Dinner Planner are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the
project aims to follow [Semantic Versioning](https://semver.org/).

> **Convention:** when a [ROADMAP.md](ROADMAP.md) item ships, it moves out of the roadmap
> and into this file under the release that delivered it.

## [Unreleased]

### Added
- **Speed & Cost at a glance:** each meal's `Speed` (Quick / Slow) and `Cost` ($–$$$) from
  the Sheet now show as pills on the day cards and in the Meals list. Display only — they
  don't influence which meals the generator picks.
- **Per-meal "Special / Sale" pill** — e.g. *Tuesdays* on Tacos — surfaced on that meal's
  day card, replacing the old separate Deals tab.
- **Thumbs up / down per meal** (Meals tab): liked meals become ~2.5× more likely to be
  picked and disliked ones ~¼ as likely — across generate, single-day shuffle, and reshuffle.
  Nothing is ever fully banned. Tap an active thumb to clear it back to neutral. Ratings sync
  via Firebase alongside the plan.
- **Rolling 3-week history with soft fade:** the generator now remembers the last three weeks.
  The most-recent week stays a hard no-repeat; meals from 2–3 weeks ago are de-prioritized
  (not excluded) so newer/unused meals surface first but can still reappear. Replaces the
  previous single-week memory.
- **Home / eat-out badge** on day cards — a house icon for cook-at-home, gold utensils for
  eat-out — replacing the earlier pot/star badge.

### Changed
- **New Sheet, transposed layout:** the app reads the restructured Google Sheet (meals as
  columns, attributes as rows) at its new id, via a label-keyed parser so row order in the
  Sheet no longer matters.
- **"Where" → "Bought / Made"** (values Homemade / Either / Bought). `Bought` is now the
  eat-out signal: it drives the ≤2-eat-out-per-week cap and keeps those meals off the
  shopping list. The eat-out day-card label reads **· BOUGHT**.
- **Day card redesign:** the always-open per-day override dropdown is gone; picking a specific
  meal now happens in a tap-to-open **picker bottom sheet**. Each card has a hairline "Change"
  footer with a shuffle (⟳, random reroll) and a list (☰, pick from all meals) button.
- **"Re-roll unlocked" → "Reshuffle week"**, which re-rolls all seven days (weighted by history
  and ratings, and avoiding the current week).
- Generator selection ordering is now a weighted shuffle (recency × rating). All hard rules and
  the lowest-priority-first relaxation ladder are unchanged, so no new "not enough meals" cases.

### Removed
- **Separate Deals tab and per-day deal pills** — superseded by the per-meal `Special / Sale`
  field. The `deals.js` module, its fetch, and the `DEALS_CSV_URL` config are gone.
- The per-day **lock** button and the inline override `<select>` dropdown — superseded by the
  picker sheet and per-day shuffle.

## [0.1.0] — 2026-05-29

First working MVP. The app reads meals live from the shared Google Sheet, auto-generates a
rule-respecting Monday–Sunday week, lets us tweak it, derives an aisle-grouped shopping
list, and optionally syncs across devices. No build step; plain ES-module files served
statically.

### Added
- **Rule-respecting week generator** with the four rules in priority order and graceful
  relaxation of the lowest-priority rule when the meal list can't satisfy all of them
  (surfaced in a banner that says what was relaxed). Backtracking selection over the meals,
  seedable for deterministic tests.
- **Tweak & pivot:** per-day override dropdown with live inline rule warnings, single-day
  swap, re-roll all unlocked days, lock a day, and a "Healthy: n/target" meter.
- **Eat-out deals:** matches the weekday to the Sheet's Deals tab and shows a coral deal
  pill on eat-out nights; degrades gracefully when the Deals tab doesn't exist yet.
- **Shopping list:** deduped from the week's cook-at-home meals, grouped by aisle
  (Produce · Meat & Seafood · Pantry · Dairy · Other), with "already have" checkboxes;
  staples stay checked across plans.
- **Data layer:** robust CSV parser + header-driven meal/deal model reading the published
  Sheet via the gviz CSV endpoint.
- **Persistence:** async key-value store over a swappable backend — localStorage by
  default, **Firebase Realtime Database** (path-scoped under `dinner/home`, reusing the
  health-tracker project) for live cross-device sync, with automatic localStorage fallback
  when the Firebase SDK can't load (e.g. offline).
- **UI/PWA:** Fresh Kitchen design system implemented in `index.html`, emoji-free
  soft-duotone inline SVG icons, bottom tab bar (Plan · Shopping · Meals), empty/error
  states, `prefers-reduced-motion` support, web manifest + service worker (installable,
  offline shell).
- **Tests:** dependency-free unit suite (33 tests) via Node's built-in `node:test` covering
  the CSV parser, model, generator, store, deal matcher, shopping builder, and render helpers.
- Project kickoff: vision, design system, roadmap, README, and this changelog.
- Brainstormed and locked the product design — see [VISION.md](VISION.md).
- Locked the visual direction: **Fresh Kitchen, modernized** (pine / mint / coral /
  paper / ink), mobile-first **Accent-bar** day cards, soft-duotone inline SVG icon set,
  bottom tab bar (Plan · Shopping · Meals). See [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md).

### Decisions
- **Data source:** meals + deals read live from the shared Google Sheet (published CSV,
  read-only); the Sheet stays the single source of truth.
- **Sync:** current plan, pantry staples, and week history stored in Firebase Realtime
  Database so both phones share one plan (mirrors the health-tracker pattern).
- **Planning model:** hybrid — auto-generate a rule-respecting week, then freely override
  any day and re-roll / pivot mid-week.
- **Rules (priority order):** (1) no repeat from last week, (2) ≤ 2 eat-out days,
  (3) no duplicate category per week, (4) healthy target (default ≥ 3/week). The generator
  relaxes the lowest-priority rule when the meal list can't satisfy all four, and says so.
- **Shopping list:** ingredients deduped and grouped by aisle; persistent staples stay
  checked week-to-week, perishables reset each new plan.
- **Hosting:** static files on GitHub Pages, no build step. (Implementation note: the
  logic is split into small `src/*.js` ES modules — imported natively by `index.html` —
  rather than one literal file, so the rule engine and helpers are unit-testable. Same
  no-build / no-framework / static-hosting intent as the original "single-file" plan.)

---

<!--
Release template — copy when cutting a version:

## [x.y.z] — YYYY-MM-DD
### Added
### Changed
### Fixed
### Removed
-->
