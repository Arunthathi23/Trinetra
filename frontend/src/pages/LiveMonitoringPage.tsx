import { useEffect, useMemo, useState } from 'react';
import { useViolations } from '../context/ViolationsContext';
import { useToast } from '../context/ToastContext';

type Alert = {
  id: string | number;
  area: string;
  status: string;
  detail: string;
  severity: 'High' | 'Medium' | 'Low';
};

type FeedBox = {
  id: string | number;
  x: string;
  y: string;
  width: string;
  height: string;
  vehicle: string;
  speed: number;
  violation: string;
};

export default function LiveMonitoringPage() {
  const { websocketAlerts, isConnected, recentViolations } = useViolations();
  const { addToast } = useToast();

  // Generate dynamic bounding boxes from websocket alerts
  const feedBoxes = useMemo(() => {
    return websocketAlerts.slice(0, 3).map((alert, index) => {
      const positions = [
        { x: '18%', y: '22%', width: '17%', height: '13%' },
        { x: '58%', y: '36%', width: '18%', height: '14%' },
        { x: '30%', y: '66%', width: '22%', height: '16%' },
      ];
      const pos = positions[index] || positions[0];

      return {
        id: alert.id,
        ...pos,
        vehicle: alert.vehicle_number || 'Unknown',
        speed: Math.floor(Math.random() * 100),
        violation: alert.violation_type || 'Unknown',
      };
    });
  }, [websocketAlerts]);

  // Convert WebSocket alerts to dashboard format
  const alerts = useMemo(
    () =>
      websocketAlerts.slice(0, 5).map((alert) => ({
        id: alert.id,
        area: alert.location,
        status: 'Active',
        detail: `${alert.violation_type} - ${alert.vehicle_number}`,
        severity: alert.severity as Alert['severity'],
      })),
    [websocketAlerts],
  );

  // Show toast for new alerts
  useEffect(() => {
    if (websocketAlerts.length > 0) {
      const latestAlert = websocketAlerts[0];
      addToast({
        id: latestAlert.id,
        timestamp: latestAlert.timestamp,
        location: latestAlert.location,
        violation_type: latestAlert.violation_type,
        vehicle_id: latestAlert.vehicle_number,
        confidence: latestAlert.confidence || 0,
        severity: latestAlert.severity,
        image_url: latestAlert.image_url,
        location_lat: latestAlert.location_lat,
        location_lng: latestAlert.location_lng,
      });
    }
  }, [websocketAlerts, addToast]);

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-800/80 bg-slate-950/85 p-8 shadow-glow">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">Live Monitoring</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Active Traffic Feed</h1>
            <p className="mt-3 max-w-2xl text-slate-400">
              Real-time camera stream and vehicle violation tracking powered by WebSocket alerts.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-sm">
              <span className={`inline-block h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-slate-300">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="rounded-[2rem] border border-slate-800/80 bg-slate-950/85 p-6 shadow-glow">
          <div className="relative h-[520px] overflow-hidden rounded-[2rem] bg-slate-900/90 shadow-inner">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.08),_transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(79,70,229,0.08),_transparent_25%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.4)_0%,rgba(15,23,42,0.8)_100%)]" />
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80')] bg-cover bg-center opacity-75" />

            <div className="absolute inset-0 rounded-[2rem] border border-slate-700/60" />

            {feedBoxes.map((box) => (
              <div
                key={box.id}
                className="absolute rounded-2xl border border-rose-500/90 bg-rose-500/10 p-2 text-xs text-white shadow-xl"
                style={{ left: box.x, top: box.y, width: box.width, height: box.height }}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="rounded-full bg-rose-500/90 px-2 py-1 text-[10px] uppercase tracking-[0.25em] text-white">{box.violation}</span>
                  <span className="animate-pulse rounded-full bg-rose-400/90 px-2 py-1 text-[10px] uppercase tracking-[0.25em] text-slate-950">Live</span>
                </div>
                <div className="space-y-1 rounded-2xl bg-slate-950/95 p-2 text-[11px] leading-4 text-slate-200">
                  <p className="font-semibold">ID: {box.vehicle}</p>
                  <p>Speed: {box.speed} km/h</p>
                  <p>Violation: {box.violation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-6 rounded-[2rem] border border-slate-800/80 bg-slate-950/85 p-6 shadow-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">Alert Panel</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Live Alerts</h2>
            </div>
            <span className="rounded-full bg-slate-900/80 px-3 py-1 text-xs uppercase tracking-[0.35em] text-slate-300">
              {alerts.length}
            </span>
          </div>

          <div className="space-y-4">
            {alerts.map((alert) => (
              <div key={alert.id} className="rounded-3xl border border-slate-800/80 bg-slate-900/75 p-4 text-slate-200 shadow-inner transition hover:bg-slate-900/90">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{alert.area}</p>
                    <p className="text-sm text-slate-400">{alert.detail}</p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] ${
                      alert.severity === 'High'
                        ? 'animate-pulse bg-rose-500/15 text-rose-300'
                        : alert.severity === 'Medium'
                        ? 'bg-amber-500/15 text-amber-300'
                        : 'bg-sky-500/15 text-sky-300'
                    }`}
                  >
                    {alert.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
