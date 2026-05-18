const pipelineColors = {
  found: 'bg-zinc-700 text-zinc-300',
  mockup_made: 'bg-indigo-900/60 text-indigo-300',
  emailed: 'bg-blue-900/60 text-blue-300',
  replied: 'bg-amber-900/60 text-amber-300',
  won: 'bg-emerald-900/60 text-emerald-300',
  rejected: 'bg-red-900/60 text-red-400',
};

const websiteColors = {
  no_website: 'bg-red-900/60 text-red-400',
  facebook_only: 'bg-orange-900/60 text-orange-400',
  outdated: 'bg-amber-900/60 text-amber-400',
  not_mobile_friendly: 'bg-yellow-900/60 text-yellow-400',
  slow: 'bg-orange-900/60 text-orange-400',
  missing_contact_info: 'bg-amber-900/60 text-amber-400',
  unknown: 'bg-zinc-700 text-zinc-400',
};

const labels = {
  found: 'Found',
  mockup_made: 'Mockup Made',
  emailed: 'Emailed',
  replied: 'Replied',
  won: 'Won',
  rejected: 'Rejected',
  no_website: 'No Website',
  facebook_only: 'Facebook Only',
  outdated: 'Outdated',
  not_mobile_friendly: 'Not Mobile',
  slow: 'Slow',
  missing_contact_info: 'Missing Contact',
  unknown: 'Unknown',
};

export function PipelineBadge({ status }) {
  const cls = pipelineColors[status] || pipelineColors.found;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {labels[status] || status}
    </span>
  );
}

export function WebsiteBadge({ status }) {
  const cls = websiteColors[status] || websiteColors.unknown;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {labels[status] || status}
    </span>
  );
}

export function ScoreBadge({ score }) {
  const cls =
    score >= 70 ? 'text-red-400 bg-red-900/40' :
    score >= 40 ? 'text-amber-400 bg-amber-900/40' :
    'text-emerald-400 bg-emerald-900/40';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold tabular-nums ${cls}`}>
      {score}
    </span>
  );
}
