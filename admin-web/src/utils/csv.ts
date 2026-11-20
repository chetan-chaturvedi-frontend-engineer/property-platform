/** A CSV column: header text and how to read the cell from a row. */
export type CsvColumn<TRow> = readonly [header: string, read: (row: TRow) => string];

/**
 * One CSV cell. Values a spreadsheet would run as a formula (=, +, -, @, tab, CR) get a leading
 * apostrophe, so exported user input cannot inject formulas.
 */
export function csvCell(value: string): string {
  // A plain "+919876543210" cannot run as a formula, so phone numbers stay unchanged.
  const isPhone = /^\+\d{6,15}$/.test(value);
  const safe = !isPhone && /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

const BOM = String.fromCharCode(0xfeff);

/** A whole CSV document. CRLF and a BOM, so Excel opens it as UTF-8. */
export function toCsv<TRow>(columns: readonly CsvColumn<TRow>[], rows: readonly TRow[]): string {
  const lines = [columns.map(([header]) => csvCell(header)).join(',')];
  for (const row of rows) {
    lines.push(columns.map(([, read]) => csvCell(read(row))).join(','));
  }
  return `${BOM}${lines.join('\r\n')}\r\n`;
}

/** Hands the CSV to the browser as a download. */
export function downloadCsv(content: string, fileName: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
