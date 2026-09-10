import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, doc, getDocs, getFirestore, writeBatch } from 'firebase/firestore';
import * as XLSX from 'xlsx';

const workbookPath = process.argv[2];
const replaceRoster = process.argv.includes('--replace');
const fromEnvironment = (name) => process.env[name] ?? process.env[`VITE_${name}`];
const firebaseConfig = {
  apiKey: fromEnvironment('FIREBASE_API_KEY'),
  authDomain: fromEnvironment('FIREBASE_AUTH_DOMAIN'),
  projectId: fromEnvironment('FIREBASE_PROJECT_ID'),
  storageBucket: fromEnvironment('FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: fromEnvironment('FIREBASE_MESSAGING_SENDER_ID'),
  appId: fromEnvironment('FIREBASE_APP_ID'),
};

if (!workbookPath) throw new Error('Pass the path to VENTURE_26_Participant_Attendance-1.xlsx.');
if (Object.values(firebaseConfig).some((value) => !value)) throw new Error('Set the Firebase configuration environment variables before seeding.');
if (!process.env.SEED_ADMIN_EMAIL || !process.env.SEED_ADMIN_PASSWORD) throw new Error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD for an organiser account.');

const workbook = XLSX.read(readFileSync(workbookPath), { type: 'buffer' });
const sheet = workbook.Sheets.Attendance ?? workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }).slice(1);
const participants = rows
  .filter((row) => String(row[1] ?? '').trim())
  .map((row, index) => ({
    id: `VEN${String(index + 1).padStart(3, '0')}`,
    name: String(row[1]).trim(),
    team: String(row[2] ?? '').trim() || 'Unassigned',
  }));

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

await signInWithEmailAndPassword(auth, process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
let batch = writeBatch(db);
let operationCount = 0;
const participantCollection = collection(db, 'events', 'venture', 'participants');
const write = async (operation) => {
  operation();
  operationCount++;
  if (operationCount % 400 === 0) {
    await batch.commit();
    batch = writeBatch(db);
  }
};

for (const participant of participants) {
  await write(() => batch.set(doc(db, 'events', 'venture', 'participants', participant.id), {
    ...participant,
    eventId: 'venture',
    ...(replaceRoster ? {
      checkInAt: null,
      meals: {
        ventureDinnerSep10: false,
        ventureBreakfastSep11: false,
        ventureLunchSep11: false,
        ventureTeaSep11: false,
      },
    } : {}),
  }, replaceRoster ? undefined : { merge: true }));
}

if (replaceRoster) {
  const currentRoster = await getDocs(participantCollection);
  const correctedIds = new Set(participants.map((participant) => participant.id));
  for (const participantDoc of currentRoster.docs) {
    if (!correctedIds.has(participantDoc.id)) {
      await write(() => batch.delete(participantDoc.ref));
    }
  }
}

if (operationCount % 400 !== 0) await batch.commit();
await signOut(auth);
console.log(`${replaceRoster ? 'Replaced' : 'Seeded'} ${participants.length} Venture participants with IDs VEN001–VEN${String(participants.length).padStart(3, '0')}.`);
