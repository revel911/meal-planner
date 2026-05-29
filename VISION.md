# 🥗 Family Dinner Planner — Vision

## The one-liner

A mobile-first web app that turns the dinner ideas my wife and I keep in a shared
Google Sheet into a planned, rule-respecting **Monday–Sunday** week — with a grocery
list we can check off against what's already in the kitchen.

## Why this exists

Deciding "what's for dinner" every night is small but relentless. We already keep a
shared Google Sheet of meals we like, but it doesn't *plan* anything — it doesn't stop
us repeating last week's spaghetti, doesn't balance eating out vs. cooking, and doesn't
turn a week of meals into a shopping list. This app does that work for us so the Sheet
stays the single source of truth and the planning happens automatically.

## Who it's for

Two people: me and my wife, on our phones, sharing one plan. Not a multi-tenant product,
not a meal-kit service. A small, fast, private tool for one family. If it's pleasant
enough that planning dinner becomes a 30-second tap instead of a nightly debate, it has
done its job.

## What it does

1. **Reads our meals live from the Google Sheet.** When we add or edit a meal there, the
   app reflects it on the next load. The Sheet stays the source of truth.
2. **Auto-generates a week that obeys our rules**, then lets us tweak any day. The four
   rules are non-negotiable inputs, not suggestions:
   - **No repeats from last week.** Don't serve a meal we just had.
   - **At most two eat-out nights.** Cooking is the default; eating out is the exception.
   - **No category twice in one week.** Seven different kinds of food, not pizza three times.
   - **A healthy-meal target.** Aim for at least a few genuinely healthy dinners each week,
     clearly badged so we're aware.
3. **Suggests restaurant deals on eat-out nights** by matching the day to our deals table
   (e.g. Taco Tuesday).
4. **Builds a shopping list** from the week's ingredients — deduped, grouped by aisle, with
   checkboxes for what we already have. Staples we always keep stay checked; perishables
   reset each new week.
5. **Stays in sync** between both of us, on any device, in real time.

## What it is *not* (non-goals)

- **Not a recipe app.** No cooking instructions, no step timers, no nutrition macros. The
  Sheet holds meal names, categories, and ingredients — that's the whole data model.
- **Not a calorie tracker.** "Healthy" is a single Yes/No flag we set ourselves, not a
  computed score.
- **Not multi-family / multi-user SaaS.** One shared plan for one household.
- **Not an inventory system.** The pantry is a lightweight "do we have this staple?" memory,
  not a stock-level tracker.
- **Not a native app.** A responsive web page we add to the home screen is enough.

## Guiding principles

- **The Sheet is the source of truth.** The app reads it; it never becomes a second place
  we have to maintain meal data.
- **Mobile-first, always.** The phone is the primary device. Desktop is a graceful
  widening of the same layout, never a separate design.
- **Rules are guardrails, not cages.** The generator respects the rules, but every day is
  overridable and we can pivot mid-week — life happens. When the meal list genuinely can't
  satisfy every rule, the app relaxes the lowest-priority one and says so, rather than
  failing silently.
- **Fast and friendly over feature-rich.** Planning a week should take seconds. Every
  feature earns its place; we cut ruthlessly (see non-goals).
- **Private and low-maintenance.** Static hosting, a free-tier database, no servers to
  babysit — the same pattern as the health-tracker.

## Success looks like

- We open the app on a phone, get a sensible week in one tap, swap one or two days, and
  walk into the store with a grouped list — in under a minute.
- We stop repeating meals week-to-week without thinking about it.
- The Sheet and the app never disagree, because the Sheet *is* the data.
- Neither of us has to "maintain the app" — it just works each week.

## The shape of the thing

A single `index.html` on GitHub Pages. Meals and deals come from the published Google
Sheet (read-only CSV). The current plan, pantry staples, and last week's history live in
Firebase so both phones see the same thing. Three screens behind a bottom tab bar:
**Plan**, **Shopping**, **Meals**.
