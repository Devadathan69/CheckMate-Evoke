import { existsSync, readFileSync } from 'node:fs';
import * as XLSX from 'xlsx';

const getColumnIndex = (headers, expectedHeader) => headers.findIndex((header) => header.toLowerCase() === expectedHeader.toLowerCase());

export const readEvokeParticipants = (workbookPath) => {
  if (!workbookPath || !existsSync(workbookPath)) {
    throw new Error('Pass the EVOKE’26 Shortlisted Team RSVP workbook path.');
  }

  const workbook = XLSX.read(readFileSync(workbookPath), { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const headers = (rows[0] ?? []).map((header) => String(header).trim());
  const teamIndex = getColumnIndex(headers, 'Team Name');
  const nameIndex = getColumnIndex(headers, 'Team Member Name');
  const attendanceIndex = headers.findIndex((header) => header.toLowerCase().includes('attend'));

  if (teamIndex < 0 || nameIndex < 0) {
    throw new Error('The RSVP workbook must include Team Name and Team Member Name columns.');
  }

  const confirmedRows = rows.slice(1)
    .filter((row) => String(row[nameIndex] ?? '').trim() && String(row[teamIndex] ?? '').trim())
    .filter((row) => attendanceIndex < 0 || /^yes$/i.test(String(row[attendanceIndex] ?? '').trim()));

  return confirmedRows.map((row, index) => ({
    id: `EVK${String(index + 1).padStart(3, '0')}`,
    name: String(row[nameIndex]).trim(),
    team: String(row[teamIndex]).trim(),
  }));
};
