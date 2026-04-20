import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { BreadcrumbNavigation } from './BreadcrumbNavigation';
import { SystemStatusIndicator } from './SystemStatusIndicator';

const menuItems = [
  { label: 'Dashboard', icon: '🏠', path: '/dashboard' },
  { label: 'Live Monitoring', icon: '📡', path: '/monitoring' },
  { label: 'Map View', icon: '🗺️', path: '/map' },
  { label: 'Violations', icon: '🚨', path: '/violations' },
  { label: 'AI Insights', icon: '🤖', path: '/insights' },
  { label: 'Explainable AI', icon: '🧠', path: '/explainable', adminOnly: true },
];

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { userRole, logout } = useAuth();
  const navigate = useNavigate();

  const availableItems = menuItems.filter((item) => !item.adminOnly || userRole === 'Admin');

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="grid min-h-screen gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-[2rem] border border-slate-800/80 bg-slate-950/90 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.55)]">
        <div className="mb-10">
          <div className="rounded-3xl bg-slate-900/80 p-4 text-center text-slate-200 shadow-inner">
            <p className="text-xs uppercase tracking-[0.35em] text-sky-300/80">TRINETRA</p>
            <h2 className="mt-4 text-2xl font-semibold text-white">Traffic AI</h2>
          </div>
        </div>

        <nav className="space-y-2">
          {availableItems.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <NavLink
                to={item.path}
                end={item.path === '/dashboard'}
                className={({ isActive }) =>
                  `group relative flex w-full items-center gap-3 rounded-3xl border px-4 py-4 text-left text-slate-200 transition-all duration-300 ${
                    isActive
                      ? 'border-sky-500/80 bg-sky-500/10 text-white shadow-[0_10px_30px_rgba(56,189,248,0.18)]'
                      : 'border-slate-800/70 bg-slate-900/80 hover:border-sky-500/60 hover:bg-slate-950/90 hover:shadow-[0_5px_15px_rgba(56,189,248,0.08)]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <motion.span
                      className="text-lg"
                      whileHover={{ scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      {item.icon}
                    </motion.span>
                    <span className="flex-1">{item.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute left-0 top-0 h-full w-1 rounded-r-full bg-sky-500"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            </motion.div>
          ))}
        </nav>

        <div className="mt-12 rounded-3xl border border-slate-800/80 bg-slate-900/70 p-5 text-sm text-slate-300">
          <p className="font-semibold text-slate-100">Role</p>
          <p className="mt-2">{userRole ?? 'Unknown'}</p>
          <p className="mt-4 text-xs leading-5 text-slate-400">
            {userRole === 'Admin'
              ? 'Full dashboard access granted.'
              : 'Limited access to core monitoring and reporting tools.'}
          </p>
        </div>
      </aside>

      <section className="flex min-h-screen flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-slate-800/80 bg-slate-950/90 px-6 py-5 shadow-glow sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-sky-300/80">TRINETRA Dashboard</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">Welcome back</h1>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="rounded-full border border-slate-800/80 bg-slate-900/80 px-4 py-3 text-sm text-slate-200">
              Role: <span className="font-semibold text-white">{userRole ?? 'Guest'}</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center rounded-full bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition-all duration-200 hover:bg-sky-400 hover:shadow-[0_0_20px_rgba(56,189,248,0.3)] active:scale-95"
            >
              Logout
            </button>
          </div>
        </header>

        <main className="flex-1 space-y-6">
          <BreadcrumbNavigation />
          {children}
        </main>

        <SystemStatusIndicator />
      </section>
    </div>
  );
}
