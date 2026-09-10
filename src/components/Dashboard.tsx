import { collection, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, Check, CheckCircle2, ChevronRight, ClipboardCheck, Coffee, DoorOpen, LogOut, QrCode, Search, UsersRound, Utensils, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { getEvent, type Meal, type MealId } from '../events';
import QRScanner from './QRScanner';

type CheckInTime = { toDate: () => Date } | null;

interface Participant {
  id: string;
  name: string;
  team: string;
  checkInAt?: CheckInTime;
  meals?: Partial<Record<MealId, boolean>>;
}

type Tab = 'overview' | 'scan' | 'participants';

interface DashboardProps {
  eventId: string;
}

const formatCheckIn = (checkInAt?: CheckInTime) => {
  if (!checkInAt) return 'Not checked in';
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(checkInAt.toDate());
};

const getParticipantId = (payload: string) => {
  const match = payload.trim().toUpperCase().match(/\bVEN\d{3}\b/);
  return match?.[0] ?? payload.trim().toUpperCase();
};

const Dashboard = ({ eventId }: DashboardProps) => {
  const event = getEvent(eventId);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selected, setSelected] = useState<Participant | null>(null);
  const [query, setQuery] = useState('');
  const [manualId, setManualId] = useState('');
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string | null>(null);
  const [error, setError] = useState('');
  const scanLock = useRef(false);

  const participantsCollection = useMemo(() => event && db ? collection(db, 'events', event.id, 'participants') : null, [event]);

  const loadParticipants = useCallback(async () => {
    if (!participantsCollection) return;

    setLoading(true);
    try {
      const snapshot = await getDocs(participantsCollection);
      const nextParticipants = snapshot.docs
        .map((participantDoc) => ({ id: participantDoc.id, ...participantDoc.data() } as Participant))
        .sort((first, second) => first.name.localeCompare(second.name));
      setParticipants(nextParticipants);
      setSelected((current) => current ? nextParticipants.find((participant) => participant.id === current.id) ?? null : null);
      setError('');
    } catch {
      setError('The roster could not be loaded. Check the Firebase settings and Firestore access rules.');
    } finally {
      setLoading(false);
    }
  }, [participantsCollection]);

  useEffect(() => {
    void loadParticipants();
  }, [loadParticipants]);

  if (!event) return null;

  const checkedInCount = participants.filter((participant) => Boolean(participant.checkInAt)).length;
  const mealTotals = Object.fromEntries(event.meals.map((meal) => [meal.id, participants.filter((participant) => participant.meals?.[meal.id]).length])) as Record<MealId, number>;
  const visibleParticipants = participants.filter((participant) => `${participant.name} ${participant.id} ${participant.team}`.toLowerCase().includes(query.toLowerCase()));

  const openParticipant = (id: string) => {
    const participant = participants.find((item) => item.id === id);
    if (!participant) {
      setError(`No participant was found for ${id}.`);
      return;
    }
    setError('');
    setSelected(participant);
  };

  const markCheckIn = async (participant: Participant) => {
    if (participant.checkInAt || !event) return;
    setAction(`${participant.id}:checkin`);
    try {
      await updateDoc(doc(db!, 'events', event.id, 'participants', participant.id), {
        checkInAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await loadParticipants();
    } catch {
      setError('Check-in could not be saved. Please try again.');
    } finally {
      setAction(null);
    }
  };

  const markMeal = async (participant: Participant, mealId: MealId) => {
    if (!participant.checkInAt || participant.meals?.[mealId] || !event) return;
    setAction(`${participant.id}:${mealId}`);
    try {
      await updateDoc(doc(db!, 'events', event.id, 'participants', participant.id), {
        [`meals.${mealId}`]: true,
        updatedAt: serverTimestamp(),
      });
      await loadParticipants();
    } catch {
      setError('Food attendance could not be saved. Please try again.');
    } finally {
      setAction(null);
    }
  };

  const handleScan = async (payload: string) => {
    if (scanLock.current) return;
    scanLock.current = true;
    const participantId = getParticipantId(payload);
    const participant = participants.find((item) => item.id === participantId);

    if (!participant) {
      setError(`No participant was found for ${participantId}.`);
      scanLock.current = false;
      return;
    }

    setError('');
    setSelected(participant);
    if (!participant.checkInAt) await markCheckIn(participant);
    scanLock.current = false;
  };

  const handleManualSearch = (formEvent: React.FormEvent) => {
    formEvent.preventDefault();
    const participantId = getParticipantId(manualId);
    openParticipant(participantId);
  };

  const handleSignOut = async () => {
    if (auth) await signOut(auth);
    navigate('/');
  };

  return (
    <main className="min-h-dvh bg-[#f4f4f1] text-[#18202a]">
      <header className="sticky top-0 z-40 border-b border-[#dde0da] bg-[#f4f4f1]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => navigate('/')} aria-label="Choose another event" className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#ff5a53] text-sm font-black text-white shadow-[0_8px_22px_rgba(255,90,83,0.24)]">E</button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">{event.name}</p>
              <p className="text-xs text-[#768080]">Evoke organiser console</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-[#dde0da] bg-white px-3 py-1.5 text-xs font-medium text-[#59626d] md:flex"><ClipboardCheck size={15} className="text-[#ff5a53]" /> {checkedInCount} of {participants.length} checked in</div>
          <button onClick={() => void handleSignOut()} className="inline-flex items-center gap-2 rounded-xl border border-[#dde0da] bg-white px-3 py-2 text-sm font-medium text-[#59626d] transition hover:border-red-200 hover:text-[#d9463e]"><LogOut size={16} /><span className="hidden sm:inline">Sign out</span></button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:py-10">
        <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-[#ff5a53]">{event.shortName}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">Attendance, in one place.</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#69727b]">Scan a badge to check in a participant, then record each meal as it is served.</p>
          </div>
          <div className="grid grid-cols-3 rounded-2xl border border-[#dde0da] bg-white p-1.5 shadow-sm">
            <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={ClipboardCheck} label="Overview" />
            <TabButton active={activeTab === 'scan'} onClick={() => setActiveTab('scan')} icon={QrCode} label="Scan QR" />
            <TabButton active={activeTab === 'participants'} onClick={() => setActiveTab('participants')} icon={UsersRound} label="Participants" />
          </div>
        </div>

        {error && <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-700"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss message"><X size={17} /></button></div>}

        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.section key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-7">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <MetricCard label="Participants" value={participants.length} detail="Rostered" icon={UsersRound} tone="bg-[#18202a] text-white" />
                <MetricCard label="Checked in" value={checkedInCount} detail={`${participants.length ? Math.round((checkedInCount / participants.length) * 100) : 0}% of roster`} icon={CheckCircle2} tone="bg-[#ff5a53] text-white" />
                {event.meals.slice(0, 3).map((meal) => <MetricCard key={meal.id} label={meal.label} value={mealTotals[meal.id]} detail={`${meal.date} · ${meal.time}`} icon={meal.id.includes('Tea') ? Coffee : Utensils} tone="bg-white text-[#18202a]" />)}
              </div>

              <div className="grid gap-7 lg:grid-cols-[1.45fr_0.8fr]">
                <section className="rounded-[1.75rem] border border-[#dde0da] bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-5 flex items-center justify-between gap-4"><div><h2 className="text-lg font-semibold tracking-tight">Participant roster</h2><p className="mt-1 text-sm text-[#75808a]">Check-in and food attendance at a glance.</p></div><button onClick={() => setActiveTab('participants')} className="hidden items-center gap-1 text-sm font-semibold text-[#d9463e] sm:inline-flex">View all <ChevronRight size={16} /></button></div>
                  <ParticipantTable participants={participants.slice(0, 6)} meals={event.meals} loading={loading} onSelect={setSelected} />
                  {participants.length > 6 && <button onClick={() => setActiveTab('participants')} className="mt-4 w-full rounded-xl bg-[#f4f4f1] py-3 text-sm font-semibold text-[#59626d] transition hover:bg-[#e9ebe6] sm:hidden">View all participants</button>}
                </section>

                <ScheduleCard meals={event.meals} totals={mealTotals} />
              </div>
            </motion.section>
          )}

          {activeTab === 'scan' && (
            <motion.section key="scan" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
              <section className="rounded-[1.75rem] border border-[#dde0da] bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-6"><p className="text-xs font-semibold tracking-[0.18em] text-[#ff5a53]">QR CHECK-IN</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">Scan the participant badge.</h2><p className="mt-2 text-sm text-[#75808a]">A valid Venture code marks the participant as checked in automatically.</p></div>
                <QRScanner onScan={(payload) => void handleScan(payload)} onClose={() => setActiveTab('overview')} />
                <form onSubmit={handleManualSearch} className="mt-6 flex gap-2">
                  <label className="relative flex-1"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8b9399]" /><input value={manualId} onChange={(input) => setManualId(input.target.value)} placeholder="Enter ID, e.g. VEN001" className="w-full rounded-xl border border-[#dde0da] bg-[#f9faf7] py-3 pl-10 pr-3 text-sm outline-none transition placeholder:text-[#a4aaa9] focus:border-[#ff5a53]" /></label>
                  <button type="submit" className="rounded-xl bg-[#18202a] px-4 text-sm font-semibold text-white transition hover:bg-[#303b47]">Find</button>
                </form>
              </section>
              <ParticipantPanel participant={selected} meals={event.meals} action={action} onClose={() => setSelected(null)} onCheckIn={(participant) => void markCheckIn(participant)} onMeal={(participant, meal) => void markMeal(participant, meal)} />
            </motion.section>
          )}

          {activeTab === 'participants' && (
            <motion.section key="participants" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
              <section className="rounded-[1.75rem] border border-[#dde0da] bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-2xl font-semibold tracking-tight">Participants</h2><p className="mt-2 text-sm text-[#75808a]">Search by person, team, or participant ID.</p></div><label className="relative block sm:w-72"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8b9399]" /><input value={query} onChange={(input) => setQuery(input.target.value)} placeholder="Search roster" className="w-full rounded-xl border border-[#dde0da] bg-[#f9faf7] py-3 pl-10 pr-3 text-sm outline-none transition placeholder:text-[#a4aaa9] focus:border-[#ff5a53]" /></label></div>
                <ParticipantTable participants={visibleParticipants} meals={event.meals} loading={loading} onSelect={setSelected} />
              </section>
              <ParticipantPanel participant={selected} meals={event.meals} action={action} onClose={() => setSelected(null)} onCheckIn={(participant) => void markCheckIn(participant)} onMeal={(participant, meal) => void markMeal(participant, meal)} />
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
};

const TabButton = ({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof ClipboardCheck; label: string }) => (
  <button onClick={onClick} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition sm:px-4 sm:text-sm ${active ? 'bg-[#18202a] text-white shadow-sm' : 'text-[#69727b] hover:bg-[#f4f4f1]'}`}><Icon size={16} /><span className="hidden sm:inline">{label}</span></button>
);

const MetricCard = ({ label, value, detail, icon: Icon, tone }: { label: string; value: number; detail: string; icon: typeof UsersRound; tone: string }) => (
  <article className={`rounded-[1.5rem] border border-[#dde0da] p-5 shadow-sm ${tone}`}><div className="flex items-start justify-between"><p className="text-sm font-medium opacity-70">{label}</p><Icon size={18} className="opacity-70" /></div><p className="mt-6 text-3xl font-semibold tracking-[-0.04em]">{value}</p><p className="mt-1 text-xs opacity-60">{detail}</p></article>
);

const ScheduleCard = ({ meals, totals }: { meals: Meal[]; totals: Record<MealId, number> }) => (
  <aside className="rounded-[1.75rem] bg-[#18202a] p-6 text-white shadow-sm"><div className="flex items-center gap-2 text-[#ffb29a]"><CalendarDays size={17} /><p className="text-xs font-semibold tracking-[0.18em]">FOOD SCHEDULE</p></div><h2 className="mt-3 text-xl font-semibold tracking-tight">Service windows</h2><div className="mt-6 space-y-3">{meals.length ? meals.map((meal) => <div key={meal.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3.5"><div><p className="text-sm font-medium">{meal.label}</p><p className="mt-0.5 text-xs text-slate-400">{meal.date} · {meal.time}</p></div><span className="rounded-lg bg-white/10 px-2.5 py-1 text-sm font-semibold">{totals[meal.id]}</span></div>) : <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300">No meal schedule has been added for this event.</p>}</div></aside>
);

const ParticipantTable = ({ participants, meals, loading, onSelect }: { participants: Participant[]; meals: Meal[]; loading: boolean; onSelect: (participant: Participant) => void }) => {
  if (loading) return <div className="grid min-h-48 place-items-center text-sm text-[#75808a]">Loading roster…</div>;
  if (!participants.length) return <div className="rounded-2xl border border-dashed border-[#cbd0c8] bg-[#fafbf8] p-7 text-center text-sm leading-6 text-[#75808a]">No participants are available yet. Import the event roster, then refresh this page.</div>;

  return <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead className="border-b border-[#e6e8e3] text-xs font-medium text-[#8b9399]"><tr><th className="pb-3">Participant</th><th className="pb-3">Team</th><th className="pb-3">Check-in</th><th className="pb-3">Food marked</th><th className="pb-3" /></tr></thead><tbody>{participants.map((participant) => { const foodCount = meals.filter((meal) => participant.meals?.[meal.id]).length; return <tr key={participant.id} className="border-b border-[#eef0ec] last:border-0"><td className="py-4"><p className="font-semibold text-sm text-[#26313a]">{participant.name}</p><p className="mt-1 font-mono text-[11px] text-[#8b9399]">{participant.id}</p></td><td className="py-4 text-sm text-[#69727b]">{participant.team}</td><td className="py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${participant.checkInAt ? 'bg-[#e7f6e9] text-[#357844]' : 'bg-[#f4f4f1] text-[#8b9399]'}`}>{participant.checkInAt && <Check size={13} />}{formatCheckIn(participant.checkInAt)}</span></td><td className="py-4"><span className="text-sm font-semibold text-[#26313a]">{foodCount}</span><span className="text-xs text-[#8b9399]"> / {meals.length}</span></td><td className="py-4 text-right"><button onClick={() => onSelect(participant)} className="rounded-xl p-2 text-[#69727b] transition hover:bg-[#f4f4f1] hover:text-[#d9463e]" aria-label={`Open ${participant.name}`}><ChevronRight size={18} /></button></td></tr>; })}</tbody></table></div>;
};

const ParticipantPanel = ({ participant, meals, action, onClose, onCheckIn, onMeal }: { participant: Participant | null; meals: Meal[]; action: string | null; onClose: () => void; onCheckIn: (participant: Participant) => void; onMeal: (participant: Participant, mealId: MealId) => void }) => {
  if (!participant) return <aside className="hidden min-h-80 place-items-center rounded-[1.75rem] border border-dashed border-[#cbd0c8] bg-[#fafbf8] p-8 text-center xl:grid"><div><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#eceee9] text-[#84908a]"><DoorOpen size={22} /></div><h2 className="mt-4 font-semibold text-[#3e4a51]">Select a participant</h2><p className="mt-2 text-sm leading-6 text-[#75808a]">Scan a QR code or choose a participant to manage their attendance.</p></div></aside>;

  return <aside className="rounded-[1.75rem] border border-[#dde0da] bg-white p-6 shadow-sm"><div className="flex items-start justify-between gap-4"><div><p className="font-mono text-xs font-medium text-[#ff5a53]">{participant.id}</p><h2 className="mt-2 text-xl font-semibold tracking-tight">{participant.name}</h2><p className="mt-1 text-sm text-[#75808a]">{participant.team}</p></div><button onClick={onClose} aria-label="Close participant" className="rounded-xl p-2 text-[#8b9399] transition hover:bg-[#f4f4f1] hover:text-[#26313a]"><X size={18} /></button></div><div className={`mt-6 rounded-2xl p-4 ${participant.checkInAt ? 'bg-[#e7f6e9]' : 'bg-[#f4f4f1]'}`}><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-[#26313a]">{participant.checkInAt ? 'Checked in' : 'Awaiting check-in'}</p><p className="mt-1 text-xs text-[#69727b]">{formatCheckIn(participant.checkInAt)}</p></div>{participant.checkInAt ? <CheckCircle2 className="text-[#357844]" size={23} /> : <button disabled={action === `${participant.id}:checkin`} onClick={() => onCheckIn(participant)} className="rounded-xl bg-[#18202a] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#303b47] disabled:opacity-50">{action === `${participant.id}:checkin` ? 'Saving…' : 'Check in'}</button>}</div></div><div className="mt-6"><div className="flex items-center justify-between"><h3 className="font-semibold">Food attendance</h3><span className="text-xs text-[#8b9399]">{meals.filter((meal) => participant.meals?.[meal.id]).length} / {meals.length}</span></div><div className="mt-3 space-y-2">{meals.length ? meals.map((meal) => { const served = Boolean(participant.meals?.[meal.id]); const saving = action === `${participant.id}:${meal.id}`; return <button key={meal.id} disabled={!participant.checkInAt || served || saving} onClick={() => onMeal(participant, meal.id)} className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${served ? 'border-[#ccead2] bg-[#e7f6e9] text-[#357844]' : participant.checkInAt ? 'border-[#dde0da] hover:border-[#ffb0aa] hover:bg-[#fff7f5]' : 'cursor-not-allowed border-[#e6e8e3] bg-[#fafbf8] text-[#9ba2a2]'}`}><span><span className="block text-sm font-semibold">{meal.label}</span><span className="mt-0.5 block text-xs opacity-70">{meal.date} · {meal.time}</span></span><span className="text-xs font-semibold">{served ? 'Served' : saving ? 'Saving…' : 'Mark served'}</span></button>; }) : <p className="rounded-xl bg-[#f4f4f1] p-4 text-sm text-[#75808a]">No food windows are configured for this event.</p>}</div>{!participant.checkInAt && meals.length > 0 && <p className="mt-3 text-xs leading-5 text-[#8b9399]">Check the participant in before recording food service.</p>}</div></aside>;
};

export default Dashboard;
