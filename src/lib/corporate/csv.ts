/**
 * CSV writing for the picking export.
 *
 * Every cell is quoted, with inner quotes doubled. A cell that begins with
 * a character spreadsheets read as the start of a formula (= + - @, tab or
 * carriage return) is prefixed with an apostrophe, so it always opens as
 * plain text.
 */

const FORMULA_START = /^[=+\-@\t\r]/

export function csvCell(value: unknown): string {
  let text = String(value)
  if (FORMULA_START.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

export function toCsv(rows: readonly (readonly unknown[])[]): string {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
}
