import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FormInput from '../components/FormInput';

type UserRole = 'Admin' | 'Officer';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('Officer');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }
    setError('');
    login(email, password, role);
    navigate('/dashboard');
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 rounded-[2rem] border border-slate-800/80 bg-slate-950/85 p-10 shadow-glow">
      <div className="space-y-4 text-center">
        <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">Secure Access</p>
        <h1 className="text-4xl font-semibold text-white">Officer Login</h1>
        <p className="text-slate-400">Sign in with your credentials and select your role to access the TRINETRA dashboard.</p>
      </div>

      <form className="grid gap-6" onSubmit={handleSubmit}>
        <FormInput label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@agency.gov" required />
        <FormInput label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required />

        <div className="grid gap-3 rounded-3xl border border-slate-800/80 bg-slate-900/70 p-4">
          <span className="text-sm font-medium text-slate-300">Role Selection</span>
          <div className="flex flex-col gap-3 sm:flex-row">
            {(['Admin', 'Officer'] as UserRole[]).map((option) => (
              <label key={option} className="inline-flex items-center gap-3 rounded-2xl border border-slate-700/80 bg-slate-950/70 px-4 py-3 transition hover:border-sky-500/70">
                <input type="radio" name="role" value={option} checked={role === option} onChange={() => setRole(option)} className="h-4 w-4 text-sky-500 accent-sky-400" />
                <span className="text-slate-200">{option}</span>
              </label>
            ))}
          </div>
        </div>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <button className="inline-flex justify-center rounded-full bg-sky-500 px-6 py-3 text-base font-semibold text-slate-950 transition hover:bg-sky-400" type="submit">
          Sign In
        </button>
      </form>
    </div>
  );
}
