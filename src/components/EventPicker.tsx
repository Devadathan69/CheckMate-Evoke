import { ArrowRight, CalendarDays, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { events } from '../events';

const EventPicker = () => {
  const navigate = useNavigate();

  return (
    <main className="min-h-dvh overflow-hidden bg-[#17012e] px-5 py-8 text-[#fcf9ff] sm:px-8 lg:px-12">
      <div aria-hidden className="pointer-events-none fixed inset-0 opacity-30 [background-image:linear-gradient(rgba(85,214,194,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(85,214,194,0.08)_1px,transparent_1px)] [background-size:34px_34px]" />
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-6xl flex-col">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center border border-[#f1d46c] bg-[#cca943] font-['Syncopate'] text-sm font-bold tracking-tight text-[#17012e] shadow-[5px_5px_0_rgba(0,0,0,0.28)]">E</div>
            <span className="font-['Syncopate'] text-lg font-bold tracking-[-0.08em]">evoke</span>
          </div>
          <span className="hidden border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-[#d8cae6] sm:block">Organiser console</span>
        </header>

        <section className="my-auto grid gap-12 py-14 lg:grid-cols-[1fr_1.15fr] lg:items-end">
          <div className="max-w-xl">
            <div className="mb-5 inline-flex items-center gap-2 border border-[#55d6c2]/35 bg-[#55d6c2]/10 px-3 py-1.5 font-['DM_Mono'] text-xs font-medium text-[#55d6c2]">
              <Sparkles size={14} /> Event operations
            </div>
            <h1 className="max-w-lg font-['Syncopate'] text-3xl font-bold tracking-[-0.09em] text-[#fcf9ff] sm:text-5xl">Choose the event you’re running.</h1>
            <p className="mt-5 max-w-md text-base leading-7 text-[#d8cae6]">Secure check-in, QR scanning, attendance tracking, and meal service in one focused workspace.</p>
            <div className="mt-10 flex flex-col gap-3 text-sm text-[#d8cae6] sm:flex-row sm:gap-7">
              <span className="flex items-center gap-2"><ShieldCheck size={17} className="text-[#55d6c2]" /> Organiser-only access</span>
              <span className="flex items-center gap-2"><UsersRound size={17} className="text-[#55d6c2]" /> Live roster</span>
            </div>
          </div>

          <div className="grid gap-4">
            {events.map((event) => (
              <button
                key={event.id}
                onClick={() => navigate(`/login/${event.id}`)}
                className="group w-full border border-white/15 bg-[#21033f]/95 p-5 text-left shadow-[8px_8px_0_rgba(0,0,0,0.23)] transition duration-300 hover:-translate-y-1 hover:border-[#55d6c2] sm:p-7"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-['DM_Mono'] text-xs font-semibold tracking-[0.18em] text-[#55d6c2]">{event.format.toUpperCase()}</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">{event.name}</h2>
                    <p className="mt-3 max-w-lg text-sm leading-6 text-[#d8cae6]">{event.description}</p>
                  </div>
                  <span className={`grid size-11 shrink-0 place-items-center border border-[#f1d46c]/60 bg-gradient-to-br ${event.accent} text-white transition duration-300 group-hover:scale-110`}><ArrowRight size={19} /></span>
                </div>
                <div className="mt-6 flex items-center gap-2 text-xs text-[#bdaaca]"><CalendarDays size={15} /> Open organiser workspace</div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};

export default EventPicker;
