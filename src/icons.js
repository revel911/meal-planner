// Soft-duotone inline SVGs. `.fill` = tinted shape (opacity .18), `.stroke` = outline.
// Both use currentColor so the icon recolors with the surrounding text color.
const svg = (paths) =>
  `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">${paths}</svg>`;

export const ICONS = {
  calendar: svg(`
    <rect class="fill" x="3" y="5" width="18" height="16" rx="3" fill="currentColor" opacity=".18"/>
    <rect class="stroke" x="3" y="5" width="18" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="1.9"/>
    <path class="stroke" d="M3 9h18M8 3v4M16 3v4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>`),
  cart: svg(`
    <path class="fill" d="M6 7h13l-1.5 8H8L6 7Z" fill="currentColor" opacity=".18"/>
    <path class="stroke" d="M3 4h2l1.5 3M6.5 7H20l-1.6 8H8.2L6.5 7Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
    <circle class="stroke" cx="9" cy="19" r="1.4" fill="none" stroke="currentColor" stroke-width="1.9"/>
    <circle class="stroke" cx="17" cy="19" r="1.4" fill="none" stroke="currentColor" stroke-width="1.9"/>`),
  utensils: svg(`
    <path class="fill" d="M7 3c1.5 0 2 2 2 5s-1 4-2 4-2-1-2-4 .5-5 2-5Z" fill="currentColor" opacity=".18"/>
    <path class="stroke" d="M7 3v18M5 3v6a2 2 0 0 0 4 0V3M16 3c-2 1-3 4-3 7h3v11" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>`),
  refresh: svg(`
    <path class="fill" d="M5 12a7 7 0 0 1 12-5l1 1V4" fill="currentColor" opacity=".18"/>
    <path class="stroke" d="M19 8A7 7 0 0 0 6 7L4 9M5 16a7 7 0 0 0 13 1l2-2M4 5v4h4M20 19v-4h-4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>`),
  leaf: svg(`
    <path class="fill" d="M5 19c0-8 6-12 14-12 0 8-6 12-14 12Z" fill="currentColor" opacity=".18"/>
    <path class="stroke" d="M5 19c0-8 6-12 14-12 0 8-6 12-14 12ZM5 19C8 14 12 11 17 9" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>`),
  tag: svg(`
    <path class="fill" d="M4 4h7l9 9-7 7-9-9V4Z" fill="currentColor" opacity=".18"/>
    <path class="stroke" d="M4 4h7l9 9-7 7-9-9V4Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>
    <circle class="stroke" cx="8" cy="8" r="1.3" fill="none" stroke="currentColor" stroke-width="1.9"/>`),
};
