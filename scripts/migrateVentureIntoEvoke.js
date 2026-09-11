import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, doc, getDocs, getFirestore, serverTimestamp, writeBatch } from 'firebase/firestore';

const fromEnvironment = (name) => process.env[name] ?? process.env[`VITE_${name}`];
const firebaseConfig = {
  apiKey: fromEnvironment('FIREBASE_API_KEY'),
  authDomain: fromEnvironment('FIREBASE_AUTH_DOMAIN'),
  projectId: fromEnvironment('FIREBASE_PROJECT_ID'),
  storageBucket: fromEnvironment('FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: fromEnvironment('FIREBASE_MESSAGING_SENDER_ID'),
  appId: fromEnvironment('FIREBASE_APP_ID'),
};

if (Object.values(firebaseConfig).some((value) => !value)) throw new Error('Set the Firebase configuration environment variables before migrating.');
if (!process.env.SEED_ADMIN_EMAIL || !process.env.SEED_ADMIN_PASSWORD) throw new Error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD for an organiser account.');

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

await signInWithEmailAndPassword(auth, process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);

try {
  const [ventureSnapshot, evokeSnapshot] = await Promise.all([
    getDocs(collection(db, 'events', 'venture', 'participants')),
    getDocs(collection(db, 'events', 'evoke-expo', 'participants')),
  ]);
  const existingEvoke = new Map(evokeSnapshot.docs.map((participantDoc) => [participantDoc.id, participantDoc.data()]));

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

  for (const ventureParticipant of ventureSnapshot.docs) {
    const source = ventureParticipant.data();
    const existing = existingEvoke.get(ventureParticipant.id);
    await write(() => batch.set(doc(db, 'events', 'evoke-expo', 'participants', ventureParticipant.id), {
      id: ventureParticipant.id,
      name: String(source.name ?? '').trim(),
      team: String(source.team ?? '').trim() || 'Unassigned',
      eventId: 'evoke-expo',
      cohort: 'venture',
      checkInAt: existing?.checkInAt ?? source.checkInAt ?? null,
      meals: { ...(existing?.meals ?? {}), ...(source.meals ?? {}) },
      updatedAt: serverTimestamp(),
    }, { merge: true }));
  }

  if (operationCount % 400 !== 0) await batch.commit();
  console.log(`Added ${ventureSnapshot.size} Venture participants to the Evoke roster. The original Venture collection was not changed.`);
} finally {
  await signOut(auth);
}
