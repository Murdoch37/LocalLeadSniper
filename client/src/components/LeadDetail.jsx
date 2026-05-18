import { useState } from 'react';
import { Modal } from './Modal';
import { LeadForm } from './LeadForm';
import { AuditPanel } from './AuditPanel';
import { EmailPanel } from './EmailPanel';
import { MockupPanel } from './MockupPanel';
import { PipelineBadge, WebsiteBadge, ScoreBadge } from './Badge';
import { Edit2, Trash2, ExternalLink } from 'lucide-react';

const TABS = [
  { id: 'details', label: 'Details' },
  { id: 'audit', label: 'Audit' },
  { id: 'email', label: 'Email' },
  { id: 'mockup', label: 'Mockup' },
];

export function LeadDetail({ lead: initialLead, onClose, onDelete, onUpdate, toast }) {
  const [lead, setLead] = useState(initialLead);
  const [tab, setTab] = useState('details');
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleLeadUpdate(updated) {
    setLead(updated);
    onUpdate(updated);
  }

  return (
    <Modal title={lead.business_name} onClose={onClose} wide>
      {/* Header strip */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-zinc-800 flex-wrap">
        <PipelineBadge status={lead.pipeline_status} />
        <WebsiteBadge status={lead.website_status} />
        <ScoreBadge score={lead.lead_score} />
        {lead.suburb && <span className="text-xs text-zinc-500">{lead.suburb}</span>}
        {lead.industry && <span className="text-xs text-zinc-500">{lead.industry}</span>}
        <div className="ml-auto flex items-center gap-2">
          {lead.website_url && (
            <a
              href={lead.website_url.startsWith('http') ? lead.website_url : 'https://' + lead.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <ExternalLink size={15} />
            </a>
          )}
          <button onClick={() => setEditing(true)} className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors">
            <Edit2 size={15} />
          </button>
          <button onClick={() => setConfirmDelete(true)} className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 px-6">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'details' && (
        <div className="p-6 grid grid-cols-2 gap-x-8 gap-y-4">
          {[
            { label: 'Business Name', value: lead.business_name },
            { label: 'Industry', value: lead.industry },
            { label: 'Suburb', value: lead.suburb },
            { label: 'Phone', value: lead.phone },
            { label: 'Email', value: lead.email },
            { label: 'Website', value: lead.website_url },
            { label: 'Last Contacted', value: lead.last_contacted_at ? new Date(lead.last_contacted_at).toLocaleDateString('en-AU') : '—' },
            { label: 'Added', value: new Date(lead.created_at).toLocaleDateString('en-AU') },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="text-xs text-zinc-500 mb-1">{label}</div>
              <div className="text-sm text-zinc-200">{value || '—'}</div>
            </div>
          ))}
          {lead.notes && (
            <div className="col-span-2">
              <div className="text-xs text-zinc-500 mb-1">Notes</div>
              <div className="text-sm text-zinc-300 whitespace-pre-wrap bg-zinc-800/50 rounded-lg px-3 py-2">{lead.notes}</div>
            </div>
          )}
        </div>
      )}

      {tab === 'audit' && (
        <AuditPanel lead={lead} onLeadUpdate={handleLeadUpdate} toast={toast} />
      )}

      {tab === 'email' && (
        <EmailPanel lead={lead} toast={toast} />
      )}

      {tab === 'mockup' && (
        <MockupPanel lead={lead} onLeadUpdate={handleLeadUpdate} toast={toast} />
      )}

      {editing && (
        <Modal title="Edit Lead" onClose={() => setEditing(false)}>
          <LeadForm
            lead={lead}
            onSaved={(updated) => { handleLeadUpdate(updated); setEditing(false); }}
            onClose={() => setEditing(false)}
            toast={toast}
          />
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Delete Lead?" onClose={() => setConfirmDelete(false)}>
          <div className="p-6">
            <p className="text-sm text-zinc-400 mb-6">
              Are you sure you want to delete <strong className="text-zinc-200">{lead.business_name}</strong>? This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200">Cancel</button>
              <button
                onClick={() => { onDelete(lead.id); onClose(); }}
                className="px-5 py-2 bg-red-700 hover:bg-red-600 text-white text-sm font-medium rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
}
