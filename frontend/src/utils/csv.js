// Quote values and neutralize spreadsheet formulas in participant-supplied data.
export function buildCsv(rows) {
  return '\uFEFF' + rows.map((row) => row.map((value) => {
    let text = String(value ?? '');
    if (/^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) {
      text = "'" + text;
    }
    return '"' + text.replace(/"/g, '""') + '"';
  }).join(',')).join('\r\n');
}

export function downloadCsv(rows, filename) {
  const url = URL.createObjectURL(new Blob([buildCsv(rows)], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
