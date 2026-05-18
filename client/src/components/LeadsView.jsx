import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { PipelineBadge, WebsiteBadge, ScoreBadge } from './Badge';
import { Modal } from './Modal';
import { LeadForm } from './LeadForm';
import { LeadDetail } from './LeadDetail';
import { Search, SlidersHorizontal, Download, ChevronUp, ChevronDown, Plus, Building2 } from 'lucide-react';

const PIPELINE_STATUSES = ['found', 'mockup_made', 'emailed', 'replied', 'won', 'rejected'];
const INDUSTRIES = ['tradie', 'hospitality', 'retail', 'professional services', 'health', 'beauty', 'automotive', 'education', 'other'];

const inputCls = 'bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors';

function SortIcon({ col, sortCol, sortOrder }) {
  if (sortCol !== col) return <ChevronUp size={12} className="opacity-20" />;
  return sortOrder === 'asc' ? <ChevronUp size={12} className="text-indigo-400" /> : <ChevronDown size={12} className="text-indigo-400" />;
}

export function LeadsView({ toast, openAddModal, setOpenAddModal }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', suburb: '', industry: '', pipeline_status: '', score_min: '', score_max: '' });
  const [sortCol, setSortCol] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState(null);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    if (openAddModal) { setAddOpen(true); setOpenAddModal(false); }
  }, [openAddModal, setOpenAddModal]);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getLeads({ ...filters, sort: sortCol, order: sortOrder });
      setLeads(data);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, sortCol, sortOrder]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  function toggleSort(col) {
    if (sortCol === col) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortOrder('asc'); }
  }

  function setFilter(k) { return (e) => setFilters(f => ({ ...f, [k]: e.target.value })); }

  async function handleDelete(id) {
    try {
      await api.deleteLead(id);
      setLeads(ls => ls.filter(l => l.id !== id));
      toast('Lead deleted', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  const csvUrl = api.exportCsv(filters);
  const activeFilters = Object.values(filters).filter(Boolean).length;

  const COLS = [
    { key: 'business_name', label: 'Business' },
    { key: 'industry', label: 'Industry' },
    { key: 'suburb', label: 'Suburb' },
    { key: 'website_status', label: 'Website' },
    { key: 'lead_score', label: 'Score' },
    { key: 'pipeline_status', label: 'Pipeline' },
    { key: 'last_contacted_at', label: 'Last Contact' },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            className={`${inputCls} pl-9 w-full`}
            placeholder="Search businesses, suburbs, notes…"
            value={filters.search}
            onChange={setFilter('search')}
          />
        </div>
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
            showFilters || activeFilters > 0
              ? 'bg-indigo-900/40 border-indigo-600 text-indigo-300'
              : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
          }`}
        >
          <SlidersHorizontal size={14} />
          Filters
          {activeFilters > 0 && <span className="bg-indigo-500 text-white text-xs px-1.5 rounded-full">{activeFilters}</span>}
        </button>
        <a
          href={csvUrl}
          download="leads.csv"
          className="flex items-center gap-2 px-3 py-2 bg-zinc-800 border border-zinc-700 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200 text-sm rounded-lg transition-colors"
        >
          <Download size={14} />
          Export CSV
        </a>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={14} />
          Add Lead
        </button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 bg-zinc-900/60 border border-zinc-800 rounded-lg p-4">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Suburb</label>
            <input className={`${inputCls} w-full`} placeholder="Any" value={filters.suburb} onChange={setFilter('suburb')} />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Industry</label>
            <select className={`${inputCls} w-full`} value={filters.industry} onChange={setFilter('industry')}>
              <option value="">Any</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i.charAt(0).toUpperCase() + i.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Pipeline</label>
            <select className={`${inputCls} w-full`} value={filters.pipeline_status} onChange={setFilter('pipeline_status')}>
              <option value="">Any</option>
              {PIPELINE_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Min Score</label>
            <input type="number" min="0" max="100" className={`${inputCls} w-full`} placeholder="0" value={filters.score_min} onChange={setFilter('score_min')} />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Max Score</label>
            <input type="number" min="0" max="100" className={`${inputCls} w-full`} placeholder="100" value={filters.score_max} onChange={setFilter('score_max')} />
          </div>
          {activeFilters > 0 && (
            <button
              onClick={() => setFilters({ search: '', suburb: '', industry: '', pipeline_status: '', score_min: '', score_max: '' })}
              className="text-xs text-zinc-500 hover:text-zinc-300 col-span-full text-left transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="grid text-xs font-medium text-zinc-500 bg-zinc-900/80 border-b border-zinc-800 px-4"
          style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 60px 1fr 1fr' }}>
          {COLS.map(col => (
            <button
              key={col.key}
              onClick={() => toggleSort(col.key)}
              className="flex items-center gap-1 py-3 hover:text-zinc-300 transition-colors text-left"
            >
              {col.label}
              <SortIcon col={col.key} sortCol={sortCol} sortOrder={sortOrder} />
            </button>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          <div className="flex items-center justify-center h-32 text-zinc-600 text-sm animate-pulse">Loading…</div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-600">
            <Building2 size={32} className="mb-3 opacity-40" />
            <p className="text-sm font-medium">No leads found</p>
            <p className="text-xs mt-1 opacity-70">Add your first lead or adjust your filters</p>
          </div>
        ) : (
          leads.map(lead => (
            <button
              key={lead.id}
              onClick={() => setSelected(lead)}
              className="grid w-full px-4 py-3.5 border-b border-zinc-800/60 hover:bg-zinc-800/40 transition-colors text-left items-center group"
              style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 60px 1fr 1fr' }}
            >
              <span className="text-sm font-medium text-zinc-200 group-hover:text-white truncate pr-4">{lead.business_name}</span>
              <span className="text-sm text-zinc-500 capitalize truncate">{lead.industry || '—'}</span>
              <span className="text-sm text-zinc-500 truncate">{lead.suburb || '—'}</span>
              <WebsiteBadge status={lead.website_status} />
              <ScoreBadge score={lead.lead_score} />
              <PipelineBadge status={lead.pipeline_status} />
              <span className="text-xs text-zinc-600">
                {lead.last_contacted_at ? new Date(lead.last_contacted_at).toLocaleDateString('en-AU') : '—'}
              </span>
            </button>
          ))
        )}
      </div>

      {leads.length > 0 && (
        <p className="text-xs text-zinc-600 text-right">{leads.length} lead{leads.length !== 1 ? 's' : ''}</p>
      )}

      {/* Add modal */}
      {addOpen && (
        <Modal title="Add Lead" onClose={() => setAddOpen(false)}>
          <LeadForm
            onSaved={(lead) => { setLeads(ls => [lead, ...ls]); setAddOpen(false); }}
            onClose={() => setAddOpen(false)}
            toast={toast}
          />
        </Modal>
      )}

      {/* Detail modal */}
      {selected && (
        <LeadDetail
          lead={selected}
          onClose={() => setSelected(null)}
          onDelete={handleDelete}
          onUpdate={(updated) => setLeads(ls => ls.map(l => l.id === updated.id ? updated : l))}
          toast={toast}
        />
      )}
    </div>
  );
}
