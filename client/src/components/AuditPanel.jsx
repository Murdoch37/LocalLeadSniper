import { useState } from 'react';
import { CheckCircle, XCircle, Loader, Zap } from 'lucide-react';
import { api } from '../api';

const CHECK_LABELS = {
  noHttps: 'No HTTPS',
  noViewport: 'No mobile viewport meta tag',
  noTitleOrDesc: 'No <title> or meta description',
  noContactLink: 'No contact page link',
  noBookingLink: 'No booking/appointment link',
  noSocialLinks: 'No social media links',
  oldCopyright: 'Copyright year outdated',
  slowLoad: 'Page load > 3 seconds',
  fetchFailed: 'Site unreachable or fetch failed',
  noWebsite: 'No website on file',
};

export function AuditPanel({ lead, onLeadUpdate, toast }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function runAudit() {
    setLoading(true);
    try {
      const data = await api.auditLead(lead.id);
      setResult(data.audit);
      onLeadUpdate(data.lead);
      toast('Audit complete', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  const checks = result?.checks || {};

  return (
    <div className="p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">Website Quality Audit</h3>
          {lead.website_url ? (
            <p className="text-xs text-zinc-500 mt-1 truncate max-w-xs">{lead.website_url}</p>
          ) : (
            <p className="text-xs text-amber-500 mt-1">No website URL on file</p>
          )}
        </div>
        <button
          onClick={runAudit}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? <Loader size={14} className="animate-spin" /> : <Zap size={14} />}
          {loading ? 'Running…' : 'Run Audit'}
        </button>
      </div>

      {result && (
        <>
          <div className="flex items-center gap-4 bg-zinc-800/60 rounded-lg px-5 py-4 border border-zinc-700/50">
            <div className="text-center">
              <div className={`text-4xl font-bold tabular-nums ${result.score >= 70 ? 'text-red-400' : result.score >= 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {result.score}
              </div>
              <div className="text-xs text-zinc-500 mt-1">Issue Score</div>
            </div>
            <div className="flex-1 text-xs text-zinc-400">
              <p>Higher score = more issues found = better opportunity.</p>
              {result.elapsed && <p className="mt-1">Load time: {result.elapsed}ms</p>}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {Object.entries(checks).map(([key, check]) => (
              <div
                key={key}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm ${
                  check.failed
                    ? 'bg-red-950/30 border-red-900/50 text-red-300'
                    : 'bg-emerald-950/30 border-emerald-900/50 text-emerald-300'
                }`}
              >
                {check.failed
                  ? <XCircle size={16} className="text-red-400 shrink-0" />
                  : <CheckCircle size={16} className="text-emerald-400 shrink-0" />}
                <span className="flex-1">{check.label || CHECK_LABELS[key] || key}</span>
                {check.failed && (
                  <span className="text-xs font-semibold text-red-400">+{check.points}pts</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {!result && !loading && (
        <div className="text-center py-10 text-zinc-500">
          <Zap size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Run an audit to score this site's web presence</p>
        </div>
      )}
    </div>
  );
}
