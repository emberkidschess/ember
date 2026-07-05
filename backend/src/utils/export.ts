export function generateCSV(
  rows: Array<Record<string, unknown>>,
  headers: string[]
): string {
  const escape = (val: unknown): string => {
    let str = val == null ? '' : String(val);
    // Spreadsheet applications interpret these prefixes as formulas. Prefix
    // them with an apostrophe so exported user data cannot execute a formula.
    if (/^[=+\-@]/.test(str)) {
      str = `'${str}`;
    }
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = headers.map(escape).join(',');
  const dataRows = rows.map((row) => headers.map((header) => escape(row[header])).join(','));
  return `\uFEFF${[headerRow, ...dataRows].join('\r\n')}`;
}

export function formatDateForExport(date: Date | string | undefined | null): string {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return String(date);
  }
}

export function formatCurrencyForExport(amount: number | undefined | null, currency = 'USD'): string {
  if (amount == null) return '';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}
