import { useState, useEffect } from 'react';
import { Download, Eye, Loader, Wand2, Plus, X } from 'lucide-react';
import { api } from '../api';

export function MockupPanel({ lead, onLeadUpdate, toast }) {
  const [loading, setLoading] = useState(false);
  const [defaults, setDefaults] = useState(null);
  const [tagline, setTagline] = useState('');
  const [about, setAbout] = useState('');
  const [services, setServices] = useState([]);
  const [html, setHtml] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    api.getMockupDefaults(lead.id).then(d => {
      setDefaults(d.industryData);
      setTagline(d.industryData.tagline);
      setAbout(d.industryData.about);
      setServices([...d.industryData.services]);
    }).catch(() => {});
  }, [lead.id]);

  async function generate() {
    setLoading(true);
    try {
      const data = await api.generateMockup(lead.id, { tagline, services, about });
      setHtml(data.html);
      setShowPreview(true);
      onLeadUpdate(data.lead);
      toast('Mockup generated', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function downloadHtml() {
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${lead.business_name.replace(/\s+/g, '_')}_mockup.html`;
    a.click();
  }

  function copyPreviewLink() {
    const url = `${window.location.origin}/mockups/${lead.id}.html`;
    navigator.clipboard.writeText(url);
    toast('Preview link copied', 'success');
  }

  const inputCls = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors';

  return (
    <div className="p-6 flex flex-col gap-5">
      <div>
        <h3 className="text-sm font-semibold text-zinc-200 mb-1">Mock Redesign Generator</h3>
        <p className="text-xs text-zinc-500">
          Industry: <span className="text-zinc-400">{lead.industry || 'default'}</span>
        </p>
      </div>

      {defaults && (
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tagline</label>
            <input className={inputCls} value={tagline} onChange={e => setTagline(e.target.value)} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-zinc-400">Services</label>
              <button
                onClick={() => setServices(s => [...s, 'New Service'])}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
              >
                <Plus size={12} /> Add
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {services.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className={inputCls}
                    value={s}
                    onChange={e => setServices(sv => sv.map((x, j) => j === i ? e.target.value : x))}
                  />
                  <button
                    onClick={() => setServices(sv => sv.filter((_, j) => j !== i))}
                    className="text-zinc-600 hover:text-red-400 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">About Text</label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={3}
              value={about}
              onChange={e => setAbout(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? <Loader size={14} className="animate-spin" /> : <Wand2 size={14} />}
          {loading ? 'Generating…' : 'Generate Mockup'}
        </button>

        {html && (
          <>
            <button
              onClick={() => setShowPreview(v => !v)}
              className="flex items-center gap-2 px-4 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm font-medium rounded-lg transition-colors"
            >
              <Eye size={14} />
              {showPreview ? 'Hide' : 'Preview'}
            </button>
            <button
              onClick={downloadHtml}
              className="flex items-center gap-2 px-4 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm font-medium rounded-lg transition-colors"
            >
              <Download size={14} />
              Export
            </button>
            <button
              onClick={copyPreviewLink}
              className="flex items-center gap-2 px-4 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm font-medium rounded-lg transition-colors text-sm"
            >
              Copy Link
            </button>
          </>
        )}
      </div>

      {showPreview && html && (
        <div className="border border-zinc-700 rounded-lg overflow-hidden">
          <div className="bg-zinc-800 px-3 py-1.5 text-xs text-zinc-500 flex items-center gap-2">
            <Eye size={12} />
            Preview — {lead.business_name}
          </div>
          <iframe
            srcDoc={html}
            className="w-full border-0"
            style={{ height: '600px' }}
            title="Mockup Preview"
            sandbox="allow-same-origin"
          />
        </div>
      )}
    </div>
  );
}
