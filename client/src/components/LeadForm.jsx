import { useState } from 'react';
import { api } from '../api';

const INDUSTRIES = ['tradie', 'hospitality', 'retail', 'professional services', 'health', 'beauty', 'automotive', 'education', 'other'];
const WEBSITE_STATUSES = ['unknown', 'no_website', 'facebook_only', 'outdated', 'not_mobile_friendly', 'slow', 'missing_contact_info'];
const PIPELINE_STATUSES = ['found', 'mockup_made', 'emailed', 'replied', 'won', 'rejected'];

const STATUS_LABELS = {
  unknown: 'Unknown', no_website: 'No Website', facebook_only: 'Facebook Only',
  outdated: 'Outdated', not_mobile_friendly: 'Not Mobile Friendly', slow: 'Slow',
  missing_contact_info: 'Missing Contact Info',
};
const PIPELINE_LABELS = {
  found: 'Found', mockup_made: 'Mockup Made', emailed: 'Emailed',
  replied: 'Replied', won: 'Won', rejected: 'Rejected',
};

function Field({ label, children, required }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-400 mb-1.5">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors';

export function LeadForm({ lead, onSaved, onClose, toast }) {
  const isEdit = !!lead;
  const [form, setForm] = useState({
    business_name: lead?.business_name || '',
    industry: lead?.industry || '',
    suburb: lead?.suburb || '',
    website_url: lead?.website_url || '',
    email: lead?.email || '',
    phone: lead?.phone || '',
    notes: lead?.notes || '',
    website_status: lead?.website_status || 'unknown',
    pipeline_status: lead?.pipeline_status || 'found',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const saved = isEdit
        ? await api.updateLead(lead.id, form)
        : await api.createLead(form);
      onSaved(saved);
      toast(isEdit ? 'Lead updated' : 'Lead added', 'success');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
      {error && (
        <div className="bg-red-950/50 border border-red-800 text-red-400 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Business Name" required>
          <input className={inputCls} value={form.business_name} onChange={set('business_name')} placeholder="Joe's Plumbing" required />
        </Field>
        <Field label="Industry">
          <select className={inputCls} value={form.industry} onChange={set('industry')}>
            <option value="">— Select —</option>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i.charAt(0).toUpperCase() + i.slice(1)}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Suburb">
          <input className={inputCls} value={form.suburb} onChange={set('suburb')} placeholder="Bondi" />
        </Field>
        <Field label="Phone">
          <input className={inputCls} value={form.phone} onChange={set('phone')} placeholder="0400 000 000" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Website URL">
          <input className={inputCls} value={form.website_url} onChange={set('website_url')} placeholder="https://example.com.au" />
        </Field>
        <Field label="Email">
          <input className={inputCls} type="email" value={form.email} onChange={set('email')} placeholder="joe@example.com.au" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Website Status">
          <select className={inputCls} value={form.website_status} onChange={set('website_status')}>
            {WEBSITE_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </Field>
        <Field label="Pipeline Status">
          <select className={inputCls} value={form.pipeline_status} onChange={set('pipeline_status')}>
            {PIPELINE_STATUSES.map(s => <option key={s} value={s}>{PIPELINE_LABELS[s]}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Notes">
        <textarea
          className={`${inputCls} resize-none`}
          rows={3}
          value={form.notes}
          onChange={set('notes')}
          placeholder="Any notes about this lead…"
        />
      </Field>

      <div className="flex justify-end gap-3 pt-2 border-t border-zinc-800">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Lead'}
        </button>
      </div>
    </form>
  );
}
