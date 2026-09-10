import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import QRCode from 'qrcode';
import { readEvokeParticipants } from './evokeRoster.js';

const workbookPath = process.argv[2];
const outputArgumentIndex = process.argv.indexOf('--output');
const outputRoot = outputArgumentIndex >= 0 && process.argv[outputArgumentIndex + 1]
  ? resolve(process.argv[outputArgumentIndex + 1])
  : resolve('outputs');
const qrDirectory = join(outputRoot, 'evoke-participant-qr-codes');
const zipPath = join(outputRoot, 'evoke-participant-qr-codes.zip');
const participants = readEvokeParticipants(workbookPath);

if (existsSync(qrDirectory)) rmSync(qrDirectory, { recursive: true, force: true });
mkdirSync(qrDirectory, { recursive: true });

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
    color: { dark: '#340561', light: '#FFFFFF' },
  });
}

const quotePowerShell = (value) => `'${value.replace(/'/g, "''")}'`;
const archiveCommand = `Compress-Archive -Path ${quotePowerShell(join(qrDirectory, '*'))} -DestinationPath ${quotePowerShell(zipPath)} -Force`;
const archive = spawnSync('powershell.exe', ['-NoProfile', '-Command', archiveCommand], { stdio: 'inherit' });

if (archive.status !== 0) throw new Error('QR PNGs were created, but the ZIP archive could not be created.');
console.log(`Created ${participants.length} Evoke QR codes at ${qrDirectory}`);
console.log(`Created ZIP archive at ${zipPath}`);
