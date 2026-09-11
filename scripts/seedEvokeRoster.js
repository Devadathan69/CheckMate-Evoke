import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getFirestore, serverTimestamp, writeBatch } from 'firebase/firestore';
import { readEvokeParticipants } from './evokeRoster.js';

const workbookPath = process.argv[2];
const fromEnvironment = (name) => process.env[name] ?? process.env[`VITE_${name}`];
const firebaseConfig = {
  apiKey: fromEnvironment('FIREBASE_API_KEY'),
  authDomain: fromEnvironment('FIREBASE_AUTH_DOMAIN'),
  projectId: fromEnvironment('FIREBASE_PROJECT_ID'),
  storageBucket: fromEnvironment('FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: fromEnvironment('FIREBASE_MESSAGING_SENDER_ID'),
  appId: fromEnvironment('FIREBASE_APP_ID'),
};

if (Object.values(firebaseConfig).some((value) => !value)) throw new Error('Set the Firebase configuration environment variables before seeding.');
if (!process.env.SEED_ADMIN_EMAIL || !process.env.SEED_ADMIN_PASSWORD) throw new Error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD for an organiser account.');

const participants = readEvokeParticipants(workbookPath);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

await signInWithEmailAndPassword(auth, process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);

try {
  let batch = writeBatch(db);
  let operationCount = 0;
  const write = async (operation) => {
    operation();
    operationCount += 1;
    if (operationCount % 400 === 0) {
      await batch.commit();
      batch = writeBatch(db);
    }
  };

  for (const participant of participants) {
    await write(() => batch.set(doc(db, 'events', 'evoke-expo', 'participants', participant.id), {
      ...participant,
      eventId: 'evoke-expo',
      cohort: 'evoke',
      updatedAt: serverTimestamp(),
    }, { merge: true }));
  }

  if (operationCount % 400 !== 0) await batch.commit();
  console.log(`Seeded ${participants.length} Evoke participants with IDs EVK001–EVK${String(participants.length).padStart(3, '0')}.`);
} finally {
  await signOut(auth);
}
