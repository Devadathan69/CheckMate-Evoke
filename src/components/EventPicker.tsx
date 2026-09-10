import { ArrowRight, CalendarDays, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { events } from '../events';

const EventPicker = () => {
  const navigate = useNavigate();

  return (
    <main className="min-h-dvh bg-[#121315] px-5 py-8 text-white sm:px-8 lg:px-12">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-6xl flex-col">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-[#ff5a53] text-sm font-black tracking-tight text-white shadow-[0_10px_35px_rgba(255,90,83,0.28)]">E</div>
            <span className="text-lg font-semibold tracking-tight">evoke</span>
          </div>
          <span className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 sm:block">Organiser console</span>
        </header>

        <section className="my-auto grid gap-12 py-14 lg:grid-cols-[1fr_1.15fr] lg:items-end">
          <div className="max-w-xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#ff8b5c]/30 bg-[#ff5a53]/10 px-3 py-1.5 text-xs font-medium text-[#ffb29a]">
              <Sparkles size={14} /> Event operations
            </div>
            <h1 className="max-w-lg text-4xl font-semibold tracking-[-0.045em] text-white sm:text-6xl">Choose the event you’re running.</h1>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-400">Secure check-in, QR scanning, attendance tracking, and meal service in one focused workspace.</p>
            <div className="mt-10 flex gap-7 text-sm text-slate-400">
              <span className="flex items-center gap-2"><ShieldCheck size={17} className="text-[#ff8b5c]" /> Organiser-only access</span>
              <span className="flex items-center gap-2"><UsersRound size={17} className="text-[#ff8b5c]" /> Live roster</span>
            </div>
          </div>

          <div className="grid gap-4">
            {events.map((event) => (
              <button
                key={event.id}
                onClick={() => navigate(`/login/${event.id}`)}
                className="group w-full rounded-[1.75rem] border border-white/10 bg-[#1c1e22] p-6 text-left shadow-2xl transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-[#22252a] sm:p-7"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.18em] text-slate-500">{event.format.toUpperCase()}</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">{event.name}</h2>
                    <p className="mt-3 max-w-lg text-sm leading-6 text-slate-400">{event.description}</p>
                  </div>
                  <span className={`grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${event.accent} text-white transition duration-300 group-hover:scale-110`}><ArrowRight size={19} /></span>
                </div>
                <div className="mt-6 flex items-center gap-2 text-xs text-slate-500"><CalendarDays size={15} /> Open organiser workspace</div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};

export default EventPicker;
