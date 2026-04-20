import { useMemo, useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useViolations } from '../context/ViolationsContext';
import { getInsights } from '../services/api';

interface InsightsData {
  peakTime: string;
  mostCommon: string;
  repeatOffenders: number;
  violationData?: any[];
  violationTypes?: any[];
  timeDistribution?: any[];
}

export default function AIInsightsPage() {
  const { violations, repeatOffenders } = useViolations();
  const [insights, setInsights] = useState<InsightsData>({
    peakTime: 'Loading...',
    mostCommon: 'Loading...',
    repeatOffenders: 0,
    violationData: [],
    violationTypes: [],
    timeDistribution: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch insights from API and process violations
  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setIsLoading(true);
        const insightsData = await getInsights();

        // Process violations data to build visualizations
        const violationsByType: { [key: string]: number } = {};
        const violationsByDate: { [key: string]: number } = {};
        const violationsByHour: { [key: string]: number } = {
          '6-8': 0, '8-10': 0, '10-12': 0, '12-14': 0, '14-16': 0, '16-18': 0, '18-20': 0, '20-22': 0,
        };

        violations.forEach((v) => {
          // Group by type
          const type = v.violation_type || 'Other';
          violationsByType[type] = (violationsByType[type] || 0) + 1;

          // Group by date
          const date = v.timestamp?.split('T')[0] || new Date().toISOString().split('T')[0];
          violationsByDate[date] = (violationsByDate[date] || 0) + 1;

          // Group by hour
          if (v.timestamp) {
            const hour = new Date(v.timestamp).getHours();
            let hourRange = '6-8';
            if (hour >= 8 && hour < 10) hourRange = '8-10';
            else if (hour >= 10 && hour < 12) hourRange = '10-12';
            else if (hour >= 12 && hour < 14) hourRange = '12-14';
            else if (hour >= 14 && hour < 16) hourRange = '14-16';
            else if (hour >= 16 && hour < 18) hourRange = '16-18';
            else if (hour >= 18 && hour < 20) hourRange = '18-20';
            else if (hour >= 20 && hour < 22) hourRange = '20-22';
            violationsByHour[hourRange]++;
          }
        });

        // Transform to chart format
        const violationData = Object.entries(violationsByDate)
          .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
          .slice(-7)
          .map(([date, violations]) => ({ date, violations }));

        const typeColors: { [key: string]: string } = {
          'Speeding': '#ef4444',
          'Red Light': '#f97316',
          'Illegal Stop': '#eab308',
          'Lane Violation': '#22c55e',
        };

        const violationTypes = Object.entries(violationsByType)
          .sort(([, a], [, b]) => b - a)
          .map(([type, count]) => ({
            type,
            count,
            color: typeColors[type] || '#3b82f6',
          }));

        const timeDistribution = Object.entries(violationsByHour).map(([hour, violations]) => ({
          hour,
          violations,
        }));

        const mostCommonType = violationTypes[0]?.type || 'Unknown';
        const peakHour = Object.entries(violationsByHour).sort(([, a], [, b]) => b - a)[0];
        const peakTime = peakHour ? `${peakHour[0].split('-')[0]}:00 - ${parseInt(peakHour[0].split('-')[1])}:00` : 'N/A';

        setInsights({
          peakTime,
          mostCommon: mostCommonType,
          repeatOffenders: repeatOffenders,
          violationData: violationData.length > 0 ? violationData : [{ date: 'No data', violations: 0 }],
          violationTypes: violationTypes.length > 0 ? violationTypes : [],
          timeDistribution: timeDistribution || [],
        });
        setError(null);
      } catch (err) {
        console.error('Failed to fetch insights:', err);
        setError('Failed to load insights');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInsights();
  }, [violations, repeatOffenders]);

  const totalViolations = useMemo(
    () => insights.violationData?.reduce((sum, item) => sum + (item.violations || 0), 0) || 0,
    [insights.violationData]
  );
  const averageViolations = useMemo(
    () => Math.round(totalViolations / (insights.violationData?.length || 1)),
    [totalViolations, insights.violationData]
  );

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-800/80 bg-slate-950/85 p-8 shadow-glow">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">AI Insights</p>
          <h1 className="text-3xl font-semibold text-white">Predictive Analytics</h1>
          <p className="max-w-2xl text-slate-400">
            AI-powered insights into traffic patterns, violation trends, and predictive enforcement recommendations.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-[1.75rem] border border-slate-800/80 bg-slate-950/90 p-6 shadow-glow">
          <div className="space-y-4">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Peak Violation Time</p>
              <p className="mt-2 text-3xl font-semibold text-white">{isLoading ? 'Loading...' : insights.peakTime}</p>
            </div>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={insights.timeDistribution || []}>
                  <Bar dataKey="violations" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <XAxis dataKey="hour" hide />
                  <YAxis hide />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-slate-800/80 bg-slate-950/90 p-6 shadow-glow">
          <div className="space-y-4">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Most Common Violation</p>
              <p className="mt-2 text-3xl font-semibold text-white">{isLoading ? 'Loading...' : insights.mostCommon}</p>
            </div>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={insights.violationTypes || []}
                    dataKey="count"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    innerRadius={20}
                    outerRadius={50}
                    animationBegin={0}
                    animationDuration={1000}
                  >
                    {(insights.violationTypes || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-slate-800/80 bg-slate-950/90 p-6 shadow-glow">
          <div className="space-y-4">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Repeat Offenders</p>
              <p className="mt-2 text-3xl font-semibold text-white">{isLoading ? 'Loading...' : insights.repeatOffenders}</p>
            </div>
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <div className="text-4xl mb-2">🔄</div>
                <p className="text-sm text-slate-400">Tracked vehicles</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-slate-800/80 bg-slate-950/85 p-8 shadow-glow">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Violations Over Time</h2>
              <p className="text-sm text-slate-400">Daily violation trends for the past week</p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={insights.violationData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="date"
                    stroke="#9ca3af"
                    fontSize={12}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '0.75rem',
                      color: '#f1f5f9',
                    }}
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Line
                    type="monotone"
                    dataKey="violations"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#1e293b' }}
                    animationDuration={1500}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-400">
              <span>Total: {totalViolations} violations</span>
              <span>Average: {averageViolations} per day</span>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-800/80 bg-slate-950/85 p-8 shadow-glow">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Violations by Type</h2>
              <p className="text-sm text-slate-400">Distribution of violation categories</p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={insights.violationTypes || []} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                  <YAxis dataKey="type" type="category" stroke="#9ca3af" fontSize={12} width={100} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '0.75rem',
                      color: '#f1f5f9',
                    }}
                  />
                  <Bar
                    dataKey="count"
                    radius={[0, 4, 4, 0]}
                    animationDuration={1500}
                  >
                    {(insights.violationTypes || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {(insights.violationTypes || []).slice(0, 4).map((type) => (
                <div key={type.type} className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: type.color }}
                  />
                  <span className="text-slate-400">{type.type}</span>
                  <span className="text-white font-semibold">{type.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-800/80 bg-slate-950/85 p-8 shadow-glow">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-white">AI Recommendations</h2>
            <p className="text-sm text-slate-400">System-generated insights and enforcement suggestions</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-3xl border border-slate-800/70 bg-slate-900/60 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-2xl bg-sky-500/15 flex items-center justify-center">
                  <span className="text-sky-400">🎯</span>
                </div>
                <div>
                  <p className="font-semibold text-white">Target Enforcement</p>
                  <p className="text-sm text-slate-400">Focus on peak hours</p>
                </div>
              </div>
              <p className="text-sm text-slate-300">
                Deploy additional cameras during peak violation hours for maximum coverage.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-800/70 bg-slate-900/60 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-2xl bg-rose-500/15 flex items-center justify-center">
                  <span className="text-rose-400">🚨</span>
                </div>
                <div>
                  <p className="font-semibold text-white">{isLoading ? 'Loading...' : insights.mostCommon} Priority</p>
                  <p className="text-sm text-slate-400">Most frequent violation</p>
                </div>
              </div>
              <p className="text-sm text-slate-300">
                Implement automated enforcement systems at high-risk locations.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-800/70 bg-slate-900/60 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-2xl bg-amber-500/15 flex items-center justify-center">
                  <span className="text-amber-400">🔄</span>
                </div>
                <div>
                  <p className="font-semibold text-white">Repeat Offender Program</p>
                  <p className="text-sm text-slate-400">{isLoading ? '...' : insights.repeatOffenders} vehicles flagged</p>
                </div>
              </div>
              <p className="text-sm text-slate-300">
                Establish graduated penalty system for vehicles with multiple violations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
