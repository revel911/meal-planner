// Find the deal whose day matches `dayName` (case-insensitive). Null if none.
export function dealForDay(deals, dayName) {
  if (!deals || deals.length === 0) return null;
  const target = String(dayName).trim().toLowerCase();
  return deals.find((d) => d.day.trim().toLowerCase() === target) || null;
}
