import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import * as XLSX from 'xlsx';
import QRCode from 'qrcode';

const workbookPath = process.argv[2];

if (!workbookPath || !existsSync(workbookPath)) {
  throw new Error('Pass the path to VENTURE_26_Participant_Attendance-1.xlsx.');
}

const outputRoot = resolve('outputs');
const qrDirectory = join(outputRoot, 'venture-participant-qr-codes');
const zipPath = join(outputRoot, 'venture-participant-qr-codes.zip');

if (existsSync(qrDirectory)) rmSync(qrDirectory, { recursive: true, force: true });
mkdirSync(qrDirectory, { recursive: true });

const workbook = XLSX.read(readFileSync(workbookPath), { type: 'buffer' });
const sheet = workbook.Sheets.Attendance ?? workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }).slice(1);
const participants = rows
  .filter((row) => String(row[1] ?? '').trim())
  .map((row, index) => ({
    id: `VEN${String(index + 1).padStart(3, '0')}`,
    name: String(row[1]).trim(),
  }));

const filenameCounts = new Map();
const filenameFor = (name) => {
  const safeName = name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim() || 'Participant';
  const count = (filenameCounts.get(safeName) ?? 0) + 1;
  filenameCounts.set(safeName, count);
  return count === 1 ? `${safeName}.png` : `${safeName} (${count}).png`;
};

for (const participant of participants) {
  await QRCode.toFile(join(qrDirectory, filenameFor(participant.name)), participant.id, {
    width: 600,
    margin: 3,
    errorCorrectionLevel: 'M',
    color: { dark: '#18202A', light: '#FFFFFF' },
  });
}

const archiveCommand = `Compress-Archive -Path '${join(qrDirectory, '*')}' -DestinationPath '${zipPath}' -Force`;
const archive = spawnSync('powershell.exe', ['-NoProfile', '-Command', archiveCommand], { stdio: 'inherit' });
if (archive.status !== 0) throw new Error('QR PNGs were created, but the ZIP archive could not be created.');

console.log(`Created ${participants.length} QR codes at ${qrDirectory}`);
console.log(`Created ZIP archive at ${zipPath}`);
