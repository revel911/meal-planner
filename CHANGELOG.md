# 📓 Changelog

All notable changes to the Family Dinner Planner are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the
project aims to follow [Semantic Versioning](https://semver.org/).

> **Convention:** when a [ROADMAP.md](ROADMAP.md) item ships, it moves out of the roadmap
> and into this file under the release that delivered it.

## [Unreleased]

### Added
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
- **Hosting:** single-file `index.html` on GitHub Pages, no build step.

---

<!--
Release template — copy when cutting a version:

## [x.y.z] — YYYY-MM-DD
### Added
### Changed
### Fixed
### Removed
-->
