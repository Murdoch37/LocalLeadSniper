const BASE = '/api';

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  const data = await res.json().catch(() => ({ error: 'Invalid response' }));
  if (!res.ok) throw new Error(data.errors?.join(', ') || data.error || 'Request failed');
  return data;
}

export const api = {
  getLeads: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null)
    ).toString();
    return request('GET', `/leads${qs ? '?' + qs : ''}`);
  },
  getLead: (id) => request('GET', `/leads/${id}`),
  createLead: (data) => request('POST', '/leads', data),
  updateLead: (id, data) => request('PUT', `/leads/${id}`, data),
  deleteLead: (id) => request('DELETE', `/leads/${id}`),
  getStats: () => request('GET', '/stats'),
  auditLead: (id) => request('POST', `/leads/${id}/audit`),
  getAudits: (id) => request('GET', `/leads/${id}/audits`),
  generateEmail: (id, data) => request('POST', `/leads/${id}/email`, data),
  generateMockup: (id, data) => request('POST', `/leads/${id}/mockup`, data),
  getMockupDefaults: (id) => request('GET', `/leads/${id}/mockup`),
  exportCsv: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null)
    ).toString();
    return `/api/leads/export/csv${qs ? '?' + qs : ''}`;
  },
};
