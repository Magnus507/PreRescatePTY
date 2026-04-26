/**
 * Utilidad robusta para exportación de datos a formato CSV.
 * Maneja el escape de caracteres especiales y garantiza la compatibilidad con Excel.
 */
export function exportToCSV<T>(data: T[], filename: string, headers: (keyof T)[]) {
  if (!data || !data.length) return;

  const csvRows = [];
  
  // Header row
  csvRows.push(headers.join(','));

  // Data rows
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header];
      const escaped = ('' + val).replace(/"/g, '""'); // Escape double quotes
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${filename}_${new Date().getTime()}.csv`);
  document.body.appendChild(link);
  
  link.click();
  document.body.removeChild(link);
}
