import { ArrowLeft, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { auth, isFirebaseConfigured } from '../firebase';
import { getEvent } from '../events';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { eventId } = useParams();
  const event = getEvent(eventId);

  if (!event) return <Navigate to="/" replace />;

  const handleLogin = async (formEvent: React.FormEvent) => {
    formEvent.preventDefault();
    if (!isFirebaseConfigured) return;

    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth!, email.trim(), password);
      navigate(`/events/${event.id}`);
    } catch {
      setError('We could not sign you in. Check the organiser email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-dvh bg-[#17012e] px-5 py-8 text-[#fcf9ff] sm:grid sm:place-items-center">
      <section className="mx-auto w-full max-w-5xl overflow-hidden border border-white/15 bg-[#21033f] shadow-[10px_10px_0_rgba(0,0,0,0.28)] sm:grid sm:grid-cols-[0.9fr_1.1fr]">
        <div className={`bg-gradient-to-br ${event.accent} p-7 sm:p-10`}>
          <button onClick={() => navigate('/')} className="mb-16 inline-flex items-center gap-2 text-sm font-medium text-white/80 transition hover:text-white"><ArrowLeft size={16} /> All events</button>
          <p className="font-['DM_Mono'] text-xs font-semibold tracking-[0.18em] text-white/70">E V O K E</p>
          <h1 className="mt-4 font-['Syncopate'] text-3xl font-bold tracking-[-0.09em] text-white">{event.name}</h1>
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/80">{event.description}</p>
          <div className="mt-12 flex items-center gap-3 text-sm text-white/90"><ShieldCheck size={20} /> Organiser access only</div>
        </div>

        <div className="p-7 sm:p-10">
          <div className="mb-8">
            <p className="font-['DM_Mono'] text-sm font-medium text-[#55d6c2]">Welcome back</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Sign in to manage the event</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">Use your organiser account to access the attendee list, QR scanner, and meal check-offs.</p>
          </div>

          {!isFirebaseConfigured && (
            <div className="mb-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
              Firebase is not configured yet. Add the required <code className="rounded bg-black/20 px-1.5 py-0.5 text-xs">VITE_FIREBASE_*</code> variables before organisers can sign in.
            </div>
          )}

          {error && <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{error}</div>}

          <form onSubmit={handleLogin} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">Email</span>
              <input value={email} onChange={(input) => setEmail(input.target.value)} type="email" required placeholder="organiser@evoke.in" className="w-full border border-white/15 bg-[#17012e] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-[#80698d] focus:border-[#55d6c2] focus:ring-2 focus:ring-[#55d6c2]/20" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">Password</span>
              <span className="relative block">
                <input value={password} onChange={(input) => setPassword(input.target.value)} type={showPassword ? 'text' : 'password'} required placeholder="Enter your password" className="w-full border border-white/15 bg-[#17012e] px-4 py-3.5 pr-12 text-sm text-white outline-none transition placeholder:text-[#80698d] focus:border-[#55d6c2] focus:ring-2 focus:ring-[#55d6c2]/20" />
                <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 transition hover:text-white">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </span>
            </label>
            <button type="submit" disabled={loading || !isFirebaseConfigured} className="flex w-full items-center justify-center gap-2 border border-[#f1d46c] bg-[#cca943] py-3.5 text-sm font-semibold text-[#17012e] shadow-[5px_5px_0_rgba(0,0,0,0.22)] transition hover:bg-[#f1d46c] disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Sign in'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
};

export default AdminLogin;
