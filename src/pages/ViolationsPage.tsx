import { useMemo, useState } from 'react';
import { useViolations } from '../context/ViolationsContext';
import Modal from '../components/Modal';

type ViolationRecord = {
  id: string | number;
  vehicle: string;
  type: string;
  time: string;
  location: string;
  status: 'Open' | 'Under Review' | 'Resolved';
  severity: 'High' | 'Medium' | 'Low';
  image: string;
};

export default function ViolationsPage() {
  const { violations, isLoading, error } = useViolations();
  const [selectedType, setSelectedType] = useState('All');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeRecord, setActiveRecord] = useState<ViolationRecord | null>(null);

  // Transform violations for UI
  const allViolations = useMemo(() =>
    violations.map((v) => ({
      id: v.id,
      vehicle: v.vehicle_number || 'Unknown',
      type: v.violation_type || 'Unknown',
      time: v.timestamp || new Date().toISOString(),
      location: v.location || 'Unknown',
      status: (v.status === 'Active' ? 'Open' : v.status) as 'Open' | 'Under Review' | 'Resolved',
      severity: v.severity,
      image: v.image_url || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1100&q=80',
    })), [violations]
  );

  // Get unique violation types from API data
  const types = useMemo(() => {
    const uniqueTypes = new Set(allViolations.map(v => v.type));
    return ['All', ...Array.from(uniqueTypes).sort()];
  }, [allViolations]);

  const filtered = useMemo(
    () =>
      allViolations.filter((record) => {
        const typeMatch = selectedType === 'All' || record.type === selectedType;
        const dateMatch = record.time.startsWith(selectedDate);
        return typeMatch && dateMatch;
      }),
    [selectedType, selectedDate, allViolations],
  );

  return (
    <div className="space-y-6 rounded-[2rem] border border-slate-800/80 bg-slate-950/85 p-8 shadow-glow">
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">Violations</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Incident Records</h1>
            <p className="mt-2 max-w-2xl text-slate-400">
              Browse flagged events, filter by date and violation type, and review vehicle evidence.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-slate-200">
              Date
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="rounded-2xl border border-slate-800/80 bg-slate-900/80 px-4 py-3 text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-200">
              Violation type
              <select
                value={selectedType}
                onChange={(event) => setSelectedType(event.target.value)}
                className="rounded-2xl border border-slate-800/80 bg-slate-900/80 px-4 py-3 text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              >
                {types.map((type) => (
                  <option key={type} value={type} className="bg-slate-950 text-slate-100">
                    {type}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-[1.75rem] border border-slate-800/80 bg-slate-900/80 shadow-inner">
        <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
          <thead className="bg-slate-950/90 text-slate-400">
            <tr>
              <th className="px-6 py-4 uppercase tracking-[0.35em]">Vehicle</th>
              <th className="px-6 py-4 uppercase tracking-[0.35em]">Violation</th>
              <th className="px-6 py-4 uppercase tracking-[0.35em]">Time</th>
              <th className="px-6 py-4 uppercase tracking-[0.35em]">Location</th>
              <th className="px-6 py-4 uppercase tracking-[0.35em]">Status</th>
              <th className="px-6 py-4 uppercase tracking-[0.35em]">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                  Loading violations...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                  {allViolations.length === 0 ? 'No violations available' : 'No violations match the selected filter.'}
                </td>
              </tr>
            ) : (
              filtered.map((record) => (
                <tr key={record.id} className="transition hover:bg-slate-800/70">
                  <td className="px-6 py-4 text-slate-100">{record.vehicle}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                        record.severity === 'High'
                          ? 'bg-rose-500/15 text-rose-300'
                          : record.severity === 'Medium'
                          ? 'bg-amber-500/15 text-amber-300'
                          : 'bg-sky-500/15 text-sky-300'
                      }`}
                    >
                      {record.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{record.time}</td>
                  <td className="px-6 py-4 text-slate-300">{record.location}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                        record.status === 'Open'
                          ? 'bg-rose-500/15 text-rose-300'
                          : record.status === 'Under Review'
                          ? 'bg-amber-500/15 text-amber-300'
                          : 'bg-emerald-500/15 text-emerald-300'
                      }`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => setActiveRecord(record)}
                      className="rounded-full bg-slate-800/90 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
                    >
                      Preview
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={activeRecord !== null}
        title={activeRecord ? `Vehicle ${activeRecord.vehicle}` : ''}
        onClose={() => setActiveRecord(null)}
      >
        {activeRecord ? (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
              <div className="rounded-[1.5rem] bg-slate-950/90 p-4 shadow-inner">
                <div className="aspect-[16/9] overflow-hidden rounded-[1.5rem] bg-slate-800">
                  <img src={activeRecord.image} alt="Violation preview" className="h-full w-full object-cover" />
                </div>
              </div>
              <div className="grid gap-4 rounded-[1.5rem] bg-slate-950/90 p-5 shadow-inner">
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Violation</p>
                  <p className="mt-2 text-lg font-semibold text-white">{activeRecord.type}</p>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Time</p>
                  <p className="mt-2 text-lg font-semibold text-white">{activeRecord.time}</p>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Location</p>
                  <p className="mt-2 text-lg font-semibold text-white">{activeRecord.location}</p>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Severity</p>
                  <p className={`mt-2 text-lg font-semibold ${activeRecord.severity === 'High' ? 'text-rose-400' : activeRecord.severity === 'Medium' ? 'text-amber-300' : 'text-sky-300'}`}>
                    {activeRecord.severity}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => setActiveRecord(null)}
                className="rounded-full border border-slate-700/80 bg-slate-900/80 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() => setActiveRecord(null)}
                className="rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
              >
                Approve
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
