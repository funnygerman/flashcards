/**
 * Minimal RFC 4180 CSV parser: comma-separated fields, `"..."` quoting with
 * `""` as an escaped quote inside a quoted field, and quoted fields may
 * contain commas or newlines. No external dependency, and this is the only
 * place CSV parsing happens (APP-6.8: it never ships to the browser).
 *
 * @param {string} text
 * @returns {string[][]} rows of raw field values
 */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  while (i < len) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === ",") {
      endField();
      i += 1;
      continue;
    }
    if (char === "\r") {
      i += 1;
      continue;
    }
    if (char === "\n") {
      endRow();
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }

  // Trailing field/row, unless the file ended cleanly on a newline.
  if (field.length > 0 || row.length > 0) {
    endRow();
  }

  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

/**
 * Parses CSV text into an array of header-keyed record objects. The first
 * row is the header; header cells are trimmed.
 *
 * @param {string} text
 * @returns {Record<string, string>[]}
 */
export function parseCsvRecords(text) {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];

  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map((h) => h.trim());

  return dataRows.map((cells) => {
    /** @type {Record<string, string>} */
    const record = {};
    headers.forEach((header, index) => {
      record[header] = cells[index] ?? "";
    });
    return record;
  });
}
