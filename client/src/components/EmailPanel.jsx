import { useState } from 'react';
import { Copy, Mail, AlertTriangle, Check } from 'lucide-react';
import { api } from '../api';

const TONES = [
  { value: 'friendly', label: 'Friendly', desc: 'Warm and approachable' },
  { value: 'casual_aussie', label: "Casual Aussie", desc: 'Relaxed, conversational' },
  { value: 'professional', label: 'Professional', desc: 'Formal, agency-style' },
  { value: 'direct', label: 'Direct', desc: 'Value-first, 3 sentences' },
];

function CopyButton({ text, disabled }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (disabled) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      disabled={disabled}
      title={disabled ? 'Fill in all sender fields first' : 'Copy to clipboard'}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-300 rounded-lg transition-colors"
    >
      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function EmailBlock({ label, content, canCopy }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400">{label}</span>
        <CopyButton text={content} disabled={!canCopy} />
      </div>
      <pre className="bg-zinc-800/60 border border-zinc-700 rounded-lg px-4 py-3 text-xs text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
        {content}
      </pre>
    </div>
  );
}

export function EmailPanel({ lead, toast }) {
  const [tone, setTone] = useState('friendly');
  const [senderName, setSenderName] = useState('');
  const [senderBusiness, setSenderBusiness] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const senderFilled = senderName.trim() && senderBusiness.trim() && senderEmail.trim();

  async function generate() {
    if (!senderFilled) {
      toast('Fill in all sender fields first', 'error');
      return;
    }
    setLoading(true);
    try {
      const data = await api.generateEmail(lead.id, {
        tone,
        sender_name: senderName,
        sender_business: senderBusiness,
        sender_email: senderEmail,
      });
      setResult(data);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 flex flex-col gap-5">
      {/* Compliance banner */}
      <div className="flex gap-3 bg-amber-950/40 border border-amber-800/50 rounded-lg px-4 py-3">
        <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-300 leading-relaxed">
          <strong>Australian Spam Act 2003 compliance.</strong> Cold B2B emails are legal when (1) the message relates to the recipient's business function, (2) you clearly identify yourself and your business, and (3) you include a functional unsubscribe option. Do not send bulk identical emails. Verify each recipient is the right contact.
        </div>
      </div>

      {/* Sender fields */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Your Name', val: senderName, set: setSenderName, ph: 'Alex Smith' },
          { label: 'Your Business', val: senderBusiness, set: setSenderBusiness, ph: 'Web Design Co' },
          { label: 'Your Email', val: senderEmail, set: setSenderEmail, ph: 'alex@example.com' },
        ].map(f => (
          <div key={f.label}>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">{f.label} <span className="text-red-400">*</span></label>
            <input
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
              value={f.val}
              onChange={e => f.set(e.target.value)}
              placeholder={f.ph}
            />
          </div>
        ))}
      </div>

      {/* Tone selector */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-2">Tone</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TONES.map(t => (
            <button
              key={t.value}
              onClick={() => setTone(t.value)}
              className={`px-3 py-2.5 rounded-lg border text-left transition-colors ${
                tone === t.value
                  ? 'bg-indigo-900/50 border-indigo-500 text-indigo-200'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              <div className="text-sm font-medium">{t.label}</div>
              <div className="text-xs mt-0.5 opacity-70">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={generate}
        disabled={loading}
        className="flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <Mail size={14} />
        {loading ? 'Generating…' : 'Generate Emails'}
      </button>

      {result && (
        <div className="flex flex-col gap-4 border-t border-zinc-800 pt-4">
          <EmailBlock label="Initial Email" content={result.initial} canCopy={!!senderFilled} />
          <EmailBlock label="Follow-up Email" content={result.follow_up} canCopy={!!senderFilled} />
          {!senderFilled && (
            <p className="text-xs text-amber-400 flex items-center gap-1.5">
              <AlertTriangle size={12} />
              Fill in all sender fields to enable copying
            </p>
          )}
        </div>
      )}
    </div>
  );
}
