import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useViolations } from '../context/ViolationsContext';
import StatCard from '../components/StatCard';

type LiveAlert = {
  id: string;
  location: string;
  severity: string;
  message: string;
};

const initialStats = {
  violations: 0,
  cameras: 42,
  alerts: 0,
  repeatOffenders: 0,
};

export default function DashboardPage() {
  const { userRole } = useAuth();
  const { addToast } = useToast();
  const {
    violations,
    recentViolations,
    websocketAlerts,
    isLoading,
    error,
    totalViolations,
    alertsToday,
    repeatOffenders,
    isConnected
  } = useViolations();
  const lastAlertId = useRef<string | null>(null);

  const roleText =
    userRole === 'Admin'
      ? 'Admin users have full access to the enforcement dashboard, settings, and system controls.'
      : 'Officer users have limited access to live monitoring, violation logs, and incident reporting.';

  const displayAlerts: LiveAlert[] = websocketAlerts.length > 0
    ? websocketAlerts.slice(0, 5).map((alert) => ({
        id: alert.id,
        location: alert.location,
        severity: alert.severity,
        message: `🚨 Violation detected in ${alert.location}`,
      }))
    : recentViolations.slice(0, 5).map((violation) => ({
        id: violation.id,
        location: violation.location || 'Unknown Location',
        severity: violation.severity,
        message: `${violation.violation_type} detected - ${violation.vehicle_number}`,
      }));

  // Handle toast notifications for new WebSocket alerts
  useEffect(() => {
    const lastAlert = websocketAlerts[0]; // Most recent alert
    if (lastAlert) {
      // Toast is handled by ViolationsContext
    }
  }, [websocketAlerts]);

  const statCards = useMemo(
    () => [
      {
        title: 'Total Violations',
        value: totalViolations,
        change: isLoading ? 'Refreshing…' : '+5 since last hour',
        icon: '🚨',
      },
      {
        title: 'Active Cameras',
        value: initialStats.cameras,
        change: isLoading ? 'Loading…' : '+1 added',
        icon: '📷',
      },
      {
        title: 'Alerts Today',
        value: alertsToday,
        change: isLoading ? 'Refreshing…' : '+2 new',
        icon: '⚠️',
      },
      {
        title: 'Repeat Offenders',
        value: repeatOffenders,
        change: isLoading ? 'Fetching…' : '+1 flagged',
        icon: '🔁',
      },
    ],
    [totalViolations, alertsToday, repeatOffenders, isLoading],
  );

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-[2rem] border border-slate-800/80 bg-slate-950/85 p-12 shadow-glow">
        <div className="space-y-2 text-center">
          <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">Command Center</p>
          <h1 className="text-4xl font-semibold text-white">Dashboard</h1>
          <p className="max-w-2xl mx-auto text-slate-400">{roleText}</p>
        </div>

        {error ? (
          <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 p-6 text-slate-100">
            <p className="font-medium text-rose-200">{error}</p>
            <p className="mt-2 text-sm text-slate-400">The dashboard will retry automatically every 5 seconds.</p>
          </div>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-40 animate-pulse rounded-[1.75rem] border border-slate-800/80 bg-slate-950/90 p-6"
                />
              ))
            : statCards.map((card) => <StatCard key={card.title} {...card} />)}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6 rounded-[2rem] border border-slate-800/80 bg-slate-950/85 p-8 shadow-glow">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">Live Insights</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">System Status</h2>
            </div>
            <span className={`rounded-full px-4 py-2 text-sm ${
              isConnected ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
            }`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          <div className="grid gap-5 rounded-3xl border border-slate-800/70 bg-slate-900/60 p-6">
            <div className="rounded-3xl bg-slate-950/80 p-6 text-slate-200 shadow-inner">
              <h3 className="text-lg font-semibold text-white">Operational Pulse</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Live traffic feeds and alert metrics are refreshed automatically to simulate real-time monitoring.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-slate-950/80 p-5 text-slate-200 shadow-inner">
                <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Camera Coverage</p>
                <p className="mt-4 text-3xl font-semibold text-white">{initialStats.cameras}</p>
              </div>
              <div className="rounded-3xl bg-slate-950/80 p-5 text-slate-200 shadow-inner">
                <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Today&apos;s Alerts</p>
                <p className="mt-4 text-3xl font-semibold text-white">{alertsToday}</p>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-6 rounded-[2rem] border border-slate-800/80 bg-slate-950/85 p-6 shadow-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">Live Alerts</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Recent Events</h2>
            </div>
            <span className="rounded-full bg-slate-900/80 px-3 py-1 text-xs uppercase tracking-[0.35em] text-slate-300">
              {displayAlerts.length}
            </span>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="rounded-3xl border border-slate-800/80 bg-slate-900/75 p-6 text-slate-400 shadow-inner">
                Loading recent violations...
              </div>
            ) : displayAlerts.length === 0 ? (
              <div className="rounded-3xl border border-slate-800/80 bg-slate-900/75 p-6 text-slate-400 shadow-inner">
                No recent violations available.
              </div>
            ) : (
              displayAlerts.map((alert) => (
                <div key={alert.id} className="rounded-3xl border border-slate-800/80 bg-slate-900/75 p-4 text-slate-200 shadow-inner transition hover:bg-slate-900">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-white">{alert.location}</p>
                    <span className={`rounded-full px-3 py-1 text-xs ${
                      alert.severity === 'High'
                        ? 'bg-rose-500/15 text-rose-300'
                        : alert.severity === 'Medium'
                        ? 'bg-amber-500/15 text-amber-300'
                        : 'bg-sky-500/15 text-sky-300'
                    }`}>
                      {alert.severity}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">{alert.message}</p>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
