import { signOut } from 'firebase/auth';
import { collection, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { AnimatePresence, motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { CalendarDays, Check, CheckCircle2, ChevronRight, ClipboardCheck, Coffee, LogOut, QrCode, Search, UsersRound, Utensils, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { getEvent, type Meal, type MealId, type ParticipantCohort } from '../events';
import QRScanner from './QRScanner';

type CheckInTime = { toDate: () => Date } | null;
type Tab = 'overview' | 'scan' | 'participants';

interface Participant {
  id: string;
  name: string;
  team: string;
  cohort?: ParticipantCohort;
  checkInAt?: CheckInTime;
  meals?: Partial<Record<MealId, boolean>>;
}

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
  const [isParticipantSheetOpen, setIsParticipantSheetOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [participantCohortFilter, setParticipantCohortFilter] = useState<ParticipantCohort>('evoke');
  const [manualId, setManualId] = useState('');
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string | null>(null);
  const [error, setError] = useState('');
  const scanLock = useRef(false);

  const participantsCollection = useMemo(
    () => event && db ? collection(db, 'events', event.id, 'participants') : null,
    [event],
  );

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

  const getParticipantCohort = (participant: Participant): ParticipantCohort => participant.cohort === 'venture' || participant.id.startsWith('VEN') ? 'venture' : 'evoke';
  const getParticipantMeals = (participant: Participant) => event.mealsByCohort[getParticipantCohort(participant)];
  const allMeals = Object.values(event.mealsByCohort).flat();
  const checkedInCount = participants.filter((participant) => Boolean(participant.checkInAt)).length;
  const mealTotals = Object.fromEntries(
    allMeals.map((meal) => [meal.id, participants.filter((participant) => participant.meals?.[meal.id]).length]),
  ) as Record<MealId, number>;
  const foodMarksForCohort = (cohort: ParticipantCohort) => participants
    .filter((participant) => getParticipantCohort(participant) === cohort)
    .reduce((total, participant) => total + getParticipantMeals(participant).filter((meal) => participant.meals?.[meal.id]).length, 0);
  const participantCountForCohort = (cohort: ParticipantCohort) => participants.filter((participant) => getParticipantCohort(participant) === cohort).length;
  const visibleParticipants = participants.filter((participant) => getParticipantCohort(participant) === participantCohortFilter && `${participant.name} ${participant.id} ${participant.team}`.toLowerCase().includes(query.toLowerCase()));

  const openParticipant = (participant: Participant, fromScan = false) => {
    setError('');
    setSelected(participant);
    setIsParticipantSheetOpen(true);
    if (fromScan) scanLock.current = true;
  };

  const closeParticipantSheet = () => {
    setIsParticipantSheetOpen(false);
    setSelected(null);
    scanLock.current = false;
  };

  const findParticipant = (id: string) => {
    const participant = participants.find((item) => item.id === id);
    if (!participant) {
      setError(`No participant was found for ${id}.`);
      return;
    }
    openParticipant(participant);
  };

  const markCheckIn = async (participant: Participant) => {
    if (participant.checkInAt || !event || !db) return;
    setAction(`${participant.id}:checkin`);
    try {
      await updateDoc(doc(db, 'events', event.id, 'participants', participant.id), {
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
    if (!participant.checkInAt || participant.meals?.[mealId] || !event || !db) return;
    setAction(`${participant.id}:${mealId}`);
    try {
      await updateDoc(doc(db, 'events', event.id, 'participants', participant.id), {
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

  const handleScan = (payload: string) => {
    if (scanLock.current || isParticipantSheetOpen) return;
    scanLock.current = true;
    const participantId = getParticipantId(payload);
    const participant = participants.find((item) => item.id === participantId);

    if (!participant) {
      setError(`No participant was found for ${participantId}.`);
      scanLock.current = false;
      return;
    }

    openParticipant(participant, true);
  };

  const handleManualSearch = (formEvent: React.FormEvent) => {
    formEvent.preventDefault();
    findParticipant(getParticipantId(manualId));
  };

  const handleSignOut = async () => {
    if (auth) await signOut(auth);
    navigate('/');
  };

  return (
    <main className="min-h-dvh overflow-x-clip bg-[#17012e] text-[#fcf9ff]">
      <div aria-hidden className="pointer-events-none fixed inset-0 opacity-30 [background-image:linear-gradient(rgba(85,214,194,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(85,214,194,0.08)_1px,transparent_1px)] [background-size:34px_34px]" />
      <header className="sticky top-0 z-40 border-b border-white/15 bg-[#17012e]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-8 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => navigate('/')} aria-label="Choose another event" className="grid size-10 shrink-0 place-items-center border border-[#f1d46c]/70 bg-[#cca943] font-['Syncopate'] text-sm font-bold text-[#17012e] shadow-[5px_5px_0_rgba(0,0,0,0.28)]">E</button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-[#fcf9ff]">{event.name}</p>
              <p className="text-xs text-[#d8cae6]">Evoke organiser console</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-[#d8cae6] md:flex"><ClipboardCheck size={15} className="text-[#55d6c2]" /> {checkedInCount} of {participants.length} checked in</div>
          <button onClick={() => void handleSignOut()} className="inline-flex items-center gap-2 border border-white/20 bg-white/5 px-3 py-2 text-sm font-medium text-[#fcf9ff] transition hover:border-[#55d6c2] hover:text-[#55d6c2]"><LogOut size={16} /><span className="hidden sm:inline">Sign out</span></button>
        </div>
      </header>

      <div className="relative mx-auto max-w-7xl px-4 py-7 sm:px-8 lg:py-10">
        <div className="mb-7 flex flex-col justify-between gap-5 lg:mb-8 lg:flex-row lg:items-end">
          <div>
            <p className="font-['DM_Mono'] text-xs font-medium tracking-[0.18em] text-[#55d6c2]">{event.shortName}</p>
            <h1 className="mt-2 font-['Syncopate'] text-2xl font-bold tracking-[-0.08em] text-[#fcf9ff] sm:text-3xl">Attendance, in one place.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#d8cae6]">Scan a badge, confirm check-in, then mark each meal as it is served.</p>
          </div>
          <nav aria-label="Dashboard views" className="grid w-full grid-cols-3 border border-white/20 bg-[#21033f]/90 p-1.5 shadow-[6px_6px_0_rgba(0,0,0,0.24)] lg:w-auto">
            <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={ClipboardCheck} label="Overview" />
            <TabButton active={activeTab === 'scan'} onClick={() => setActiveTab('scan')} icon={QrCode} label="Scan QR" />
            <TabButton active={activeTab === 'participants'} onClick={() => setActiveTab('participants')} icon={UsersRound} label="Participants" />
          </nav>
        </div>

        {error && <div role="alert" className="mb-6 flex items-start justify-between gap-4 border border-[#f1d46c]/60 bg-[#cca943]/15 px-4 py-3.5 text-sm text-[#fff3c7]"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss message" className="text-[#f1d46c]"><X size={17} /></button></div>}

        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.section key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5 sm:space-y-7">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Participants" value={participants.length} detail="Rostered" icon={UsersRound} tone="bg-[#21033f] border-white/15 text-[#fcf9ff]" />
                <MetricCard label="Checked in" value={checkedInCount} detail={`${participants.length ? Math.round((checkedInCount / participants.length) * 100) : 0}% of roster`} icon={CheckCircle2} tone="bg-[#8238b3] border-[#b66ee7]/50 text-white" />
                <MetricCard label="Venture food marked" value={foodMarksForCohort('venture')} detail="Original food attendance" icon={Utensils} tone="bg-[#fcf9ff] border-[#f1d46c] text-[#21033f]" />
                <MetricCard label="Evoke food marked" value={foodMarksForCohort('evoke')} detail="11 Sep service windows" icon={Coffee} tone="bg-[#fcf9ff] border-[#f1d46c] text-[#21033f]" />
              </div>

              <div className="grid gap-5 lg:grid-cols-[1.45fr_0.8fr] lg:gap-7">
                <section className="border border-white/15 bg-[#21033f]/95 p-4 shadow-[7px_7px_0_rgba(0,0,0,0.22)] sm:p-6">
                  <div className="mb-5 flex items-center justify-between gap-4"><div><h2 className="text-lg font-semibold tracking-tight">Participant roster</h2><p className="mt-1 text-sm text-[#d8cae6]">Check-in and food attendance at a glance.</p></div><button onClick={() => setActiveTab('participants')} className="hidden items-center gap-1 text-sm font-semibold text-[#55d6c2] sm:inline-flex">View all <ChevronRight size={16} /></button></div>
                  <ParticipantTable participants={participants.slice(0, 6)} getMeals={getParticipantMeals} loading={loading} onSelect={openParticipant} />
                  {participants.length > 6 && <button onClick={() => setActiveTab('participants')} className="mt-4 w-full border border-white/15 bg-white/5 py-3 text-sm font-semibold text-[#fcf9ff] transition hover:border-[#55d6c2] sm:hidden">View all participants</button>}
                </section>
                <ScheduleCard mealGroups={event.mealsByCohort} totals={mealTotals} />
              </div>
            </motion.section>
          )}

          {activeTab === 'scan' && (
            <motion.section key="scan" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mx-auto max-w-2xl">
              <section className="border border-white/15 bg-[#21033f]/95 p-4 shadow-[7px_7px_0_rgba(0,0,0,0.22)] sm:p-7">
                <div className="mb-6"><p className="font-['DM_Mono'] text-xs font-medium tracking-[0.18em] text-[#55d6c2]">QR CHECK-IN</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">Scan the participant badge.</h2><p className="mt-2 text-sm leading-6 text-[#d8cae6]">A valid code opens the participant panel. Confirm attendance before check-in, then mark food service when it is served.</p></div>
                <QRScanner onScan={handleScan} onClose={() => setActiveTab('overview')} />
                <form onSubmit={handleManualSearch} className="mt-6 flex gap-2">
                  <label className="relative flex-1"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#bdaaca]" /><input value={manualId} onChange={(input) => setManualId(input.target.value)} placeholder="Enter ID, e.g. VEN001" className="w-full border border-white/20 bg-[#17012e] py-3 pl-10 pr-3 text-sm text-[#fcf9ff] outline-none transition placeholder:text-[#917ba0] focus:border-[#55d6c2]" /></label>
                  <button type="submit" className="border border-[#f1d46c] bg-[#cca943] px-4 text-sm font-semibold text-[#17012e] transition hover:bg-[#f1d46c]">Find</button>
                </form>
              </section>
            </motion.section>
          )}

          {activeTab === 'participants' && (
            <motion.section key="participants" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <section className="border border-white/15 bg-[#21033f]/95 p-4 shadow-[7px_7px_0_rgba(0,0,0,0.22)] sm:p-7">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-2xl font-semibold tracking-tight">Participants</h2><p className="mt-2 text-sm text-[#d8cae6]">Search by person, team, or participant ID within the selected group.</p></div><label className="relative block sm:w-72"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#bdaaca]" /><input value={query} onChange={(input) => setQuery(input.target.value)} placeholder="Search selected group" className="w-full border border-white/20 bg-[#17012e] py-3 pl-10 pr-3 text-sm text-[#fcf9ff] outline-none transition placeholder:text-[#917ba0] focus:border-[#55d6c2]" /></label></div>
                <nav aria-label="Participant roster sections" className="mb-5 grid grid-cols-2 border border-white/20 bg-[#17012e] p-1.5 sm:max-w-md"><CohortButton active={participantCohortFilter === 'evoke'} onClick={() => setParticipantCohortFilter('evoke')} label="Evoke" count={participantCountForCohort('evoke')} /><CohortButton active={participantCohortFilter === 'venture'} onClick={() => setParticipantCohortFilter('venture')} label="Venture" count={participantCountForCohort('venture')} /></nav>
                <ParticipantTable participants={visibleParticipants} getMeals={getParticipantMeals} loading={loading} onSelect={openParticipant} />
              </section>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isParticipantSheetOpen && selected && (
          <ParticipantSheet participant={selected} cohort={getParticipantCohort(selected)} meals={getParticipantMeals(selected)} action={action} onClose={closeParticipantSheet} onCheckIn={(participant) => void markCheckIn(participant)} onMeal={(participant, meal) => void markMeal(participant, meal)} />
        )}
      </AnimatePresence>
    </main>
  );
};

const TabButton = ({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: LucideIcon; label: string }) => (
  <button onClick={onClick} className={`flex min-w-0 items-center justify-center gap-2 px-2.5 py-2.5 text-xs font-semibold transition sm:px-4 sm:text-sm ${active ? 'bg-[#cca943] text-[#17012e] shadow-[3px_3px_0_rgba(0,0,0,0.25)]' : 'text-[#d8cae6] hover:bg-white/10 hover:text-[#55d6c2]'}`}><Icon size={16} /><span className="hidden sm:inline">{label}</span></button>
);

const CohortButton = ({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) => (
  <button onClick={onClick} className={`flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold transition ${active ? 'bg-[#8238b3] text-white shadow-[3px_3px_0_rgba(0,0,0,0.25)]' : 'text-[#d8cae6] hover:bg-white/10 hover:text-[#55d6c2]'}`}><span>{label}</span><span className={`border px-1.5 py-0.5 font-['DM_Mono'] text-[10px] ${active ? 'border-white/35 bg-white/10' : 'border-white/20'}`}>{count}</span></button>
);

const MetricCard = ({ label, value, detail, icon: Icon, tone }: { label: string; value: number; detail: string; icon: LucideIcon; tone: string }) => (
  <article className={`border p-5 shadow-[5px_5px_0_rgba(0,0,0,0.2)] ${tone}`}><div className="flex items-start justify-between"><p className="text-sm font-medium opacity-70">{label}</p><Icon size={18} className="opacity-70" /></div><p className="mt-6 text-3xl font-semibold tracking-[-0.04em]">{value}</p><p className="mt-1 text-xs opacity-60">{detail}</p></article>
);

const ScheduleCard = ({ mealGroups, totals }: { mealGroups: Record<ParticipantCohort, Meal[]>; totals: Record<MealId, number> }) => (
  <aside className="border border-[#8238b3] bg-[#17012e] p-5 text-white shadow-[7px_7px_0_rgba(0,0,0,0.25)] sm:p-6"><div className="flex items-center gap-2 text-[#55d6c2]"><CalendarDays size={17} /><p className="font-['DM_Mono'] text-xs font-semibold tracking-[0.18em]">FOOD SCHEDULE</p></div><h2 className="mt-3 text-xl font-semibold tracking-tight">Service windows</h2><div className="mt-6 space-y-5">{(Object.entries(mealGroups) as [ParticipantCohort, Meal[]][]).map(([cohort, meals]) => <section key={cohort}><p className="mb-2 font-['DM_Mono'] text-[11px] font-medium tracking-[0.16em] text-[#f1d46c]">{cohort === 'venture' ? 'VENTURE HACKATHON' : 'EVOKE 2026'}</p><div className="space-y-2">{meals.map((meal) => <div key={meal.id} className="flex items-center justify-between border border-white/15 bg-white/5 p-3"><div><p className="text-sm font-medium">{meal.label}</p><p className="mt-0.5 text-xs text-[#c8b4d6]">{meal.date} · {meal.time}</p></div><span className="border border-[#55d6c2]/40 bg-[#55d6c2]/10 px-2.5 py-1 text-sm font-semibold text-[#55d6c2]">{totals[meal.id]}</span></div>)}</div></section>)}</div></aside>
);

const ParticipantTable = ({ participants, getMeals, loading, onSelect }: { participants: Participant[]; getMeals: (participant: Participant) => Meal[]; loading: boolean; onSelect: (participant: Participant) => void }) => {
  if (loading) return <div className="grid min-h-48 place-items-center text-sm text-[#d8cae6]">Loading roster…</div>;
  if (!participants.length) return <div className="border border-dashed border-white/25 bg-white/5 p-7 text-center text-sm leading-6 text-[#d8cae6]">No participants are available yet. Import the event roster, then refresh this page.</div>;

  return <>
    <div className="space-y-2 md:hidden">{participants.map((participant) => {
      const meals = getMeals(participant);
      const foodCount = meals.filter((meal) => participant.meals?.[meal.id]).length;
      return <button key={participant.id} onClick={() => onSelect(participant)} className="w-full border border-white/15 bg-[#17012e]/60 p-3 text-left transition hover:border-[#55d6c2]"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#fcf9ff]">{participant.name}</p><p className="mt-1 font-['DM_Mono'] text-[11px] text-[#55d6c2]">{participant.id}</p></div><ChevronRight className="mt-1 shrink-0 text-[#f1d46c]" size={18} /></div><div className="mt-3 flex flex-wrap items-center gap-2 text-xs"><span className={`inline-flex items-center gap-1 border px-2 py-1 ${participant.checkInAt ? 'border-[#55d6c2]/45 bg-[#55d6c2]/10 text-[#55d6c2]' : 'border-white/15 text-[#c8b4d6]'}`}>{participant.checkInAt && <Check size={12} />}{participant.checkInAt ? 'Checked in' : 'Not checked in'}</span><span className="text-[#c8b4d6]">{foodCount} / {meals.length} meals</span></div></button>;
    })}</div>
    <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[650px] text-left"><thead className="border-b border-white/15 text-xs font-medium text-[#bdaaca]"><tr><th className="pb-3">Participant</th><th className="pb-3">Team</th><th className="pb-3">Check-in</th><th className="pb-3">Food marked</th><th className="pb-3" /></tr></thead><tbody>{participants.map((participant) => { const meals = getMeals(participant); const foodCount = meals.filter((meal) => participant.meals?.[meal.id]).length; return <tr key={participant.id} className="border-b border-white/10 last:border-0"><td className="py-4"><p className="text-sm font-semibold text-[#fcf9ff]">{participant.name}</p><p className="mt-1 font-['DM_Mono'] text-[11px] text-[#55d6c2]">{participant.id}</p></td><td className="py-4 text-sm text-[#d8cae6]">{participant.team}</td><td className="py-4"><span className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs font-medium ${participant.checkInAt ? 'border-[#55d6c2]/45 bg-[#55d6c2]/10 text-[#55d6c2]' : 'border-white/15 bg-white/5 text-[#c8b4d6]'}`}>{participant.checkInAt && <Check size={13} />}{formatCheckIn(participant.checkInAt)}</span></td><td className="py-4"><span className="text-sm font-semibold text-[#fcf9ff]">{foodCount}</span><span className="text-xs text-[#bdaaca]"> / {meals.length}</span></td><td className="py-4 text-right"><button onClick={() => onSelect(participant)} className="p-2 text-[#d8cae6] transition hover:bg-white/10 hover:text-[#55d6c2]" aria-label={`Open ${participant.name}`}><ChevronRight size={18} /></button></td></tr>; })}</tbody></table></div>
  </>;
};

const ParticipantSheet = ({ participant, cohort, meals, action, onClose, onCheckIn, onMeal }: { participant: Participant; cohort: ParticipantCohort; meals: Meal[]; action: string | null; onClose: () => void; onCheckIn: (participant: Participant) => void; onMeal: (participant: Participant, mealId: MealId) => void }) => (
  <motion.div className="fixed inset-0 z-50 flex items-end bg-[#090012]/75 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
    <motion.aside role="dialog" aria-modal="true" aria-labelledby="participant-title" className="max-h-[90dvh] w-full overflow-y-auto border border-[#f1d46c]/60 bg-[#21033f] p-5 shadow-[10px_10px_0_rgba(0,0,0,0.32)] sm:max-w-lg sm:p-6" initial={{ y: 32, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 32, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 280 }} onMouseDown={(event) => event.stopPropagation()}>
      <div className="mx-auto mb-5 h-1 w-10 bg-[#f1d46c]/70 sm:hidden" />
      <div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="font-['DM_Mono'] text-xs font-medium text-[#55d6c2]">{participant.id}</p><h2 id="participant-title" className="mt-2 truncate text-2xl font-semibold tracking-tight text-[#fcf9ff]">{participant.name}</h2><p className="mt-1 text-sm text-[#d8cae6]">{participant.team}</p><span className="mt-3 inline-flex border border-[#f1d46c]/45 bg-[#f1d46c]/10 px-2 py-1 font-['DM_Mono'] text-[10px] font-medium tracking-[0.12em] text-[#f1d46c]">{cohort === 'venture' ? 'VENTURE FOOD WINDOWS' : 'EVOKE FOOD WINDOWS'}</span></div><button onClick={onClose} aria-label="Close participant details" className="shrink-0 border border-white/15 p-2 text-[#d8cae6] transition hover:border-[#55d6c2] hover:text-[#55d6c2]"><X size={18} /></button></div>

      <div className={`mt-6 border p-4 ${participant.checkInAt ? 'border-[#55d6c2]/50 bg-[#55d6c2]/10' : 'border-[#f1d46c]/45 bg-[#cca943]/10'}`}><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-[#fcf9ff]">{participant.checkInAt ? 'Checked in' : 'Ready to check in'}</p><p className="mt-1 text-xs text-[#d8cae6]">{formatCheckIn(participant.checkInAt)}</p></div>{participant.checkInAt ? <CheckCircle2 className="text-[#55d6c2]" size={24} /> : <button disabled={action === `${participant.id}:checkin`} onClick={() => onCheckIn(participant)} className="border border-[#f1d46c] bg-[#cca943] px-4 py-2.5 text-sm font-bold text-[#17012e] transition hover:bg-[#f1d46c] disabled:opacity-50">{action === `${participant.id}:checkin` ? 'Saving…' : 'Check in'}</button>}</div></div>

      <div className="mt-6"><div className="flex items-center justify-between"><h3 className="font-semibold text-[#fcf9ff]">Food attendance</h3><span className="font-['DM_Mono'] text-xs text-[#bdaaca]">{meals.filter((meal) => participant.meals?.[meal.id]).length} / {meals.length}</span></div><p className="mt-1 text-xs text-[#d8cae6]">Mark each checkbox as the participant receives the meal.</p><div className="mt-3 space-y-2">{meals.length ? meals.map((meal) => { const served = Boolean(participant.meals?.[meal.id]); const saving = action === `${participant.id}:${meal.id}`; return <button key={meal.id} disabled={!participant.checkInAt || served || saving} onClick={() => onMeal(participant, meal.id)} className={`flex w-full items-center justify-between gap-3 border p-3 text-left transition ${served ? 'border-[#55d6c2]/45 bg-[#55d6c2]/10 text-[#55d6c2]' : participant.checkInAt ? 'border-white/20 bg-[#17012e] text-[#fcf9ff] hover:border-[#f1d46c]' : 'cursor-not-allowed border-white/10 bg-white/5 text-[#9d88aa]'}`}><span className="min-w-0"><span className="block text-sm font-semibold">{meal.label}</span><span className="mt-0.5 block text-xs opacity-70">{meal.date} · {meal.time}</span></span><span aria-hidden className={`grid size-6 shrink-0 place-items-center border ${served ? 'border-[#55d6c2] bg-[#55d6c2] text-[#17012e]' : 'border-current'}`}>{served ? <Check size={15} strokeWidth={3} /> : saving ? '…' : null}</span></button>; }) : <p className="border border-white/10 bg-white/5 p-4 text-sm text-[#d8cae6]">No food windows are configured for this event.</p>}</div>{!participant.checkInAt && meals.length > 0 && <p className="mt-3 text-xs leading-5 text-[#f1d46c]">Use Check in above before recording food service.</p>}</div>
    </motion.aside>
  </motion.div>
);

export default Dashboard;
