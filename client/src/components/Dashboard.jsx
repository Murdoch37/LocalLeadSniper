import { useEffect, useState } from 'react';
import { api } from '../api';
import { PipelineBadge, ScoreBadge } from './Badge';
import { TrendingUp, Users, Mail, Award } from 'lucide-react';

const PIPELINE_ORDER = ['found', 'mockup_made', 'emailed', 'replied', 'won', 'rejected'];

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 bg-indigo-900/30 rounded-lg text-indigo-400">{icon}</div>
        <span className="text-xs text-zinc-500">{sub}</span>
      </div>
      <div className="text-3xl font-bold text-zinc-100 tabular-nums">{value}</div>
      <div className="text-xs text-zinc-500 mt-1">{label}</div>
    </div>
  );
}

export function Dashboard({ onLeadClick }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStats().then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-600">
        <div className="animate-pulse">Loading dashboard…</div>
      </div>
    );
  }

  if (!stats) return null;

  const statusMap = Object.fromEntries(stats.byStatus.map(s => [s.pipeline_status, s.count]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">Your lead pipeline at a glance</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={<Users size={18} />} label="Total Leads" value={stats.total} sub="all time" />
        <StatCard icon={<TrendingUp size={18} />} label="Avg Issue Score" value={stats.avgScore} sub="higher = more opportunity" />
        <StatCard icon={<Mail size={18} />} label="Contacted This Week" value={stats.contactedThisWeek} sub="last 7 days" />
        <StatCard
          icon={<Award size={18} />}
          label="Won"
          value={statusMap['won'] || 0}
          sub={`${stats.total ? Math.round(((statusMap['won'] || 0) / stats.total) * 100) : 0}% conversion`}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Pipeline breakdown */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">Pipeline Status</h2>
          <div className="flex flex-col gap-2">
            {PIPELINE_ORDER.map(status => {
              const count = statusMap[status] || 0;
              const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={status} className="flex items-center gap-3">
                  <PipelineBadge status={status} />
                  <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
                    <div
                      className="bg-indigo-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-400 w-6 text-right tabular-nums">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent leads */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">Recent Leads</h2>
          {stats.recentLeads.length === 0 ? (
            <p className="text-sm text-zinc-600">No leads yet. Add your first one!</p>
          ) : (
            <div className="flex flex-col gap-2">
              {stats.recentLeads.map(lead => (
                <button
                  key={lead.id}
                  onClick={() => onLeadClick(lead)}
                  className="flex items-center gap-3 px-3 py-2.5 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg text-left transition-colors w-full"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-200 truncate">{lead.business_name}</div>
                    <div className="text-xs text-zinc-500">{lead.suburb || 'No suburb'}</div>
                  </div>
                  <ScoreBadge score={lead.lead_score} />
                  <PipelineBadge status={lead.pipeline_status} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Industry breakdown */}
      {stats.byIndustry.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">Top Industries</h2>
          <div className="flex flex-wrap gap-2">
            {stats.byIndustry.map(({ industry, count }) => (
              <div key={industry} className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2">
                <span className="text-sm text-zinc-300 capitalize">{industry}</span>
                <span className="text-xs font-bold text-indigo-400">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
