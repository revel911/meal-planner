// Minimal RFC-4180-style CSV parser: handles quoted fields, embedded commas,
// embedded newlines, and "" escaped quotes. Returns an array of row arrays.
export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { rows.push(row); row = []; };

  // Normalize CRLF to LF so newline handling is uniform.
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { pushField(); i++; continue; }
    if (c === '\n') { pushField(); pushRow(); i++; continue; }
    field += c; i++;
  }
  // Flush the final field/row unless the input ended exactly on a newline.
  if (field !== '' || row.length > 0) { pushField(); pushRow(); }
  return rows;
}
