import Papa from 'papaparse';
import { ViolationAlert } from '../hooks/useWebSocket';

export const exportViolationsAsCSV = (violations: ViolationAlert[], filename = 'violations.csv') => {
  const data = violations.map(v => ({
    'Vehicle ID': v.vehicle_id,
    'Violation Type': v.violation_type,
    'Severity': v.severity,
    'Location': v.location,
    'Latitude': v.location_lat,
    'Longitude': v.location_lng,
    'Timestamp': new Date(v.timestamp).toLocaleString(),
    'Confidence': (v.confidence * 100).toFixed(1) + '%',
  }));

  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Export violations as printable HTML report
export const exportViolationsAsPDF = (
  violations: ViolationAlert[],
  mapElement: HTMLElement | null,
  filename = 'violations-report.pdf'
) => {
  const element = document.createElement('div');
  element.style.padding = '40px';
  element.style.fontFamily = 'Arial, sans-serif';
  element.style.backgroundColor = 'white';
  element.style.color = '#1f2937';
  element.style.lineHeight = '1.6';

  // Title
  const title = document.createElement('h1');
  title.textContent = 'Traffic Violation Report';
  title.style.color = '#1e293b';
  title.style.marginBottom = '10px';
  element.appendChild(title);

  // Timestamp
  const timestamp = document.createElement('p');
  timestamp.textContent = `Generated: ${new Date().toLocaleString()}`;
  timestamp.style.color = '#64748b';
  timestamp.style.marginBottom = '30px';
  element.appendChild(timestamp);

  // Summary stats
  const statsTitle = document.createElement('h2');
  statsTitle.textContent = 'Summary Statistics';
  statsTitle.style.marginTop = '30px';
  statsTitle.style.marginBottom = '15px';
  element.appendChild(statsTitle);

  const severityCounts = {
    High: violations.filter(v => v.severity === 'High').length,
    Medium: violations.filter(v => v.severity === 'Medium').length,
    Low: violations.filter(v => v.severity === 'Low').length,
  };

  const stats = document.createElement('table');
  stats.style.width = '100%';
  stats.style.borderCollapse = 'collapse';
  stats.style.marginBottom = '30px';
  stats.style.border = '1px solid #e5e7eb';

  const rows = [
    ['Total Violations', violations.length.toString()],
    ['High Severity', severityCounts.High.toString()],
    ['Medium Severity', severityCounts.Medium.toString()],
    ['Low Severity', severityCounts.Low.toString()],
  ];

  rows.forEach(([label, value]) => {
    const row = stats.insertRow();
    const cell1 = row.insertCell(0);
    const cell2 = row.insertCell(1);
    cell1.textContent = label;
    cell2.textContent = value;
    cell1.style.padding = '12px';
    cell2.style.padding = '12px';
    cell1.style.backgroundColor = '#f9fafb';
    cell1.style.borderBottom = '1px solid #e5e7eb';
    cell2.style.borderBottom = '1px solid #e5e7eb';
    cell2.style.textAlign = 'right';
  });

  element.appendChild(stats);

  // Detailed violations table
  const tableTitle = document.createElement('h2');
  tableTitle.textContent = 'Detailed Violations List';
  tableTitle.style.marginTop = '40px';
  tableTitle.style.marginBottom = '15px';
  element.appendChild(tableTitle);

  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  table.style.fontSize = '12px';
  table.style.border = '1px solid #e5e7eb';

  // Header
  const headerRow = table.insertRow();
  const headers = ['Vehicle', 'Type', 'Severity', 'Location', 'Time', 'Confidence'];
  headers.forEach((header, index) => {
    const cell = headerRow.insertCell();
    cell.textContent = header;
    cell.style.padding = '10px';
    cell.style.backgroundColor = '#f3f4f6';
    cell.style.borderBottom = '2px solid #d1d5db';
    cell.style.fontWeight = 'bold';
    cell.style.textAlign = index === 5 ? 'right' : 'left';
  });

  // Data rows
  violations.forEach(v => {
    const row = table.insertRow();
    const cells = [
      v.vehicle_id,
      v.violation_type,
      v.severity,
      v.location,
      new Date(v.timestamp).toLocaleString(),
      (v.confidence * 100).toFixed(1) + '%',
    ];
    cells.forEach((cellData, index) => {
      const cell = row.insertCell();
      cell.textContent = cellData;
      cell.style.padding = '10px';
      cell.style.borderBottom = '1px solid #e5e7eb';
      cell.style.textAlign = index === 5 ? 'right' : 'left';
    });
  });

  element.appendChild(table);

  // Open print dialog
  const printWindow = window.open('', '', 'height=700,width=900');
  if (printWindow) {
    printWindow.document.write('<!DOCTYPE html>');
    printWindow.document.write('<html><head><title>' + filename + '</title>');
    printWindow.document.write('<style>');
    printWindow.document.write('body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }');
    printWindow.document.write('h1 { color: #1e293b; margin-bottom: 10px; }');
    printWindow.document.write('h2 { color: #475569; margin-top: 30px; margin-bottom: 15px; }');
    printWindow.document.write('table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e5e7eb; }');
    printWindow.document.write('th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }');
    printWindow.document.write('th { background-color: #f3f4f6; font-weight: bold; }');
    printWindow.document.write('tr:nth-child(even) { background-color: #f9fafb; }');
    printWindow.document.write('p { color: #64748b; }');
    printWindow.document.write('@media print { body { margin: 0; padding: 10px; } }');
    printWindow.document.write('</style></head><body>');
    printWindow.document.write(element.outerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
  }
};
