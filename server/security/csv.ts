const dangerousFormulaStart = /^[=+\-@\t\r]/;

export function escapeCsvCell(value: unknown): string {
  let cell = value == null ? "" : String(value);
  if (dangerousFormulaStart.test(cell)) cell = `'${cell}`;
  return `"${cell.replaceAll('"', '""')}"`;
}

export function rowsToCsv(rows: ReadonlyArray<Record<string, unknown>>): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0] ?? {});
  return [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => headers.map((key) => escapeCsvCell(row[key])).join(",")),
  ].join("\r\n");
}
