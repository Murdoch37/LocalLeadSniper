import { useState } from 'react';
import { Search, MapPin, Loader, Import, CheckSquare, Square, Globe, Facebook, AlertCircle, Zap, TrendingUp } from 'lucide-react';

const STATES = [
  { value: '', label: 'Any state' },
  { value: 'TAS', label: 'TAS' },
  { value: 'VIC', label: 'VIC' },
  { value: 'NSW', label: 'NSW' },
  { value: 'QLD', label: 'QLD' },
  { value: 'WA', label: 'WA' },
  { value: 'SA', label: 'SA' },
  { value: 'ACT', label: 'ACT' },
  { value: 'NT', label: 'NT' },
];

const CATEGORIES = [
  { value: 'hospitality', label: 'Hospitality', emoji: '🍽️' },
  { value: 'retail', label: 'Retail', emoji: '🛍️' },
  { value: 'tradie', label: 'Trades', emoji: '🔧' },
  { value: 'health', label: 'Health', emoji: '🏥' },
  { value: 'beauty', label: 'Beauty', emoji: '💇' },
  { value: 'automotive', label: 'Automotive', emoji: '🚗' },
  { value: 'professional services', label: 'Professional', emoji: '💼' },
];

function WebPresencePill({ status }) {
  if (status === 'no_website') return (
    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-900/50 text-red-300 font-medium border border-red-800/50">
      <AlertCircle size={10} /> No website
    </span>
  );
  if (status === 'facebook_only') return (
    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-900/50 text-blue-300 font-medium border border-blue-800/50">
      <Facebook size={10} /> Facebook only
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-400 font-medium">
      <Globe size={10} /> Has website
    </span>
  );
}

function ScoreBar({ score }) {
  const color = score >= 70 ? 'bg-red-500' : score >= 40 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 bg-zinc-700 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-bold tabular-nums ${score >= 70 ? 'text-red-400' : score >= 40 ? 'text-amber-400' : 'text-zinc-500'}`}>
        {score}
      </span>
    </div>
  );
}

export function DiscoverView({ toast }) {
  const [suburb, setSuburb] = useState('');
  const [state, setState] = useState('TAS');
  const [categories, setCategories] = useState([]);
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [filterNoSite, setFilterNoSite] = useState(false);

  function toggleCategory(cat) {
    setCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  }

  function toggleSelect(idx) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  function selectAll() {
    const visible = getVisible();
    const allSelected = visible.every(([idx]) => selected.has(idx));
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(visible.map(([idx]) => idx)));
    }
  }

  function selectNoWebsite() {
    if (!results) return;
    const noSiteIdxs = results.results
      .map((b, i) => [i, b])
      .filter(([, b]) => b.website_status === 'no_website')
      .map(([i]) => i);
    setSelected(new Set(noSiteIdxs));
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!suburb.trim()) return;
    setSearching(true);
    setResults(null);
    setSelected(new Set());
    setImportResults(null);

    try {
      const res = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suburb: suburb.trim(), state: state || undefined, categories }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setResults(data);
      if (data.total === 0) toast('No businesses found — try a different suburb name (e.g. "Fitzroy" not "Fitzroy, VIC")', 'info');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSearching(false);
    }
  }

  async function handleImport() {
    if (selected.size === 0) return;
    setImporting(true);
    const toImport = [...selected].map(i => results.results[i]);

    try {
      const res = await fetch('/api/discover/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businesses: toImport }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setImportResults(data);
      toast(`Imported ${data.imported} lead${data.imported !== 1 ? 's' : ''}${data.skipped ? `, skipped ${data.skipped} duplicate${data.skipped !== 1 ? 's' : ''}` : ''}`, 'success');
      setSelected(new Set());
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setImporting(false);
    }
  }

  function getVisible() {
    if (!results) return [];
    return results.results
      .map((b, i) => [i, b])
      .filter(([, b]) => !filterNoSite || b.website_status === 'no_website');
  }

  const visible = getVisible();
  const noWebsiteCount = results?.results.filter(b => b.website_status === 'no_website').length ?? 0;
  const fbOnlyCount = results?.results.filter(b => b.website_status === 'facebook_only').length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Discover Businesses</h1>
        <p className="text-sm text-zinc-500 mt-1">Find real local businesses via OpenStreetMap, scored by web presence weakness</p>
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="Suburb name, e.g. Claremont, Glenorchy, Sandy Bay…"
              value={suburb}
              onChange={e => setSuburb(e.target.value)}
              required
            />
          </div>
          <select
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors"
            value={state}
            onChange={e => setState(e.target.value)}
          >
            {STATES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={searching || !suburb.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
          >
            {searching ? <Loader size={14} className="animate-spin" /> : <Search size={14} />}
            {searching ? 'Searching…' : 'Search'}
          </button>
        </div>

        {/* Category filter */}
        <div>
          <p className="text-xs text-zinc-500 mb-2">Filter by category <span className="text-zinc-600">(leave blank for all)</span></p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                type="button"
                onClick={() => toggleCategory(cat.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  categories.includes(cat.value)
                    ? 'bg-indigo-900/50 border-indigo-500 text-indigo-200'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                <span>{cat.emoji}</span>{cat.label}
              </button>
            ))}
          </div>
        </div>
      </form>

      {/* Tip */}
      {!results && !searching && (
        <div className="flex gap-3 bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
          <TrendingUp size={18} className="text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-sm text-zinc-400">
            <p className="font-medium text-zinc-300 mb-1">How it works</p>
            <p>We query OpenStreetMap for real businesses in your suburb. Ones with <span className="text-red-400 font-medium">no website</span> or <span className="text-blue-400 font-medium">Facebook only</span> are your best targets — select them and import to your CRM in one click. Each import automatically runs a full audit.</p>
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="flex flex-col gap-4">
          {/* Summary bar */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-zinc-400">{results.total} businesses found in <strong className="text-zinc-200">{results.suburb}</strong></span>
              {noWebsiteCount > 0 && (
                <span className="text-red-400 font-medium">{noWebsiteCount} with no website</span>
              )}
              {fbOnlyCount > 0 && (
                <span className="text-blue-400 font-medium">{fbOnlyCount} Facebook only</span>
              )}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setFilterNoSite(v => !v)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  filterNoSite
                    ? 'bg-red-900/40 border-red-700 text-red-300'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                {filterNoSite ? 'Show all' : 'No website only'}
              </button>
              <button onClick={selectAll} className="text-xs px-3 py-1.5 bg-zinc-800 border border-zinc-700 hover:border-zinc-600 text-zinc-400 rounded-lg transition-colors">
                {visible.every(([idx]) => selected.has(idx)) ? 'Deselect all' : 'Select all'}
              </button>
              {noWebsiteCount > 0 && (
                <button onClick={selectNoWebsite} className="text-xs px-3 py-1.5 bg-red-900/30 border border-red-800/50 text-red-300 rounded-lg hover:bg-red-900/50 transition-colors">
                  Select no-website
                </button>
              )}
            </div>
          </div>

          {/* Import bar */}
          {selected.size > 0 && (
            <div className="flex items-center gap-4 bg-indigo-950/50 border border-indigo-700/50 rounded-xl px-5 py-3">
              <Zap size={16} className="text-indigo-400 shrink-0" />
              <span className="text-sm text-indigo-200 flex-1">
                <strong>{selected.size}</strong> selected — will import and auto-audit each one
              </span>
              <button
                onClick={handleImport}
                disabled={importing}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {importing ? <Loader size={14} className="animate-spin" /> : <Import size={14} />}
                {importing ? 'Importing…' : `Import ${selected.size} lead${selected.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          )}

          {/* Import results */}
          {importResults && (
            <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-xl px-5 py-4 text-sm text-emerald-300">
              ✓ Imported {importResults.imported} lead{importResults.imported !== 1 ? 's' : ''} with audit scores.
              {importResults.skipped > 0 && ` Skipped ${importResults.skipped} already in your CRM.`}
              {' '}<span className="text-emerald-400 font-medium">Check the Leads tab to see them.</span>
            </div>
          )}

          {/* Results table */}
          {visible.length === 0 ? (
            <div className="text-center py-12 text-zinc-600">
              <AlertCircle size={28} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No businesses match this filter</p>
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="grid text-xs font-medium text-zinc-500 border-b border-zinc-800 px-4 py-3"
                style={{ gridTemplateColumns: '28px 2fr 1fr 1fr 80px 80px' }}>
                <span />
                <span>Business</span>
                <span>Industry</span>
                <span>Web Presence</span>
                <span>Score</span>
                <span>Contact</span>
              </div>

              {visible.map(([idx, biz]) => {
                const isSelected = selected.has(idx);
                const wasImported = importResults?.results?.find(r => r.business_name === biz.business_name && r.status === 'imported');
                const wasSkipped = importResults?.results?.find(r => r.business_name === biz.business_name && r.status === 'skipped');

                return (
                  <div
                    key={idx}
                    onClick={() => !wasImported && !wasSkipped && toggleSelect(idx)}
                    className={`grid items-center px-4 py-3.5 border-b border-zinc-800/60 transition-colors cursor-pointer ${
                      wasImported ? 'bg-emerald-950/20 opacity-60' :
                      wasSkipped ? 'bg-zinc-800/20 opacity-50' :
                      isSelected ? 'bg-indigo-950/30' :
                      'hover:bg-zinc-800/40'
                    }`}
                    style={{ gridTemplateColumns: '28px 2fr 1fr 1fr 80px 80px' }}
                  >
                    <div className="text-zinc-500">
                      {wasImported ? <span className="text-emerald-400 text-xs">✓</span> :
                       wasSkipped ? <span className="text-zinc-600 text-xs">–</span> :
                       isSelected ? <CheckSquare size={16} className="text-indigo-400" /> :
                       <Square size={16} className="text-zinc-700" />}
                    </div>
                    <div className="pr-4">
                      <div className="text-sm font-medium text-zinc-200 truncate">{biz.business_name}</div>
                      {biz.website_url && (
                        <a
                          href={biz.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-xs text-zinc-600 hover:text-indigo-400 truncate block transition-colors max-w-xs"
                        >
                          {biz.website_url.replace(/^https?:\/\//, '')}
                        </a>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500 capitalize">{biz.industry || '—'}</span>
                    <WebPresencePill status={biz.website_status} />
                    <div>
                      {wasImported
                        ? <ScoreBar score={wasImported.score} />
                        : <span className="text-xs text-zinc-600">on import</span>
                      }
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {biz.phone && <span className="text-xs text-zinc-500 truncate">{biz.phone}</span>}
                      {biz.email && <span className="text-xs text-zinc-500 truncate">{biz.email}</span>}
                      {!biz.phone && !biz.email && <span className="text-xs text-zinc-700">—</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
