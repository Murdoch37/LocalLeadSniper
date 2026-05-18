const express = require('express');
const router = express.Router();
const db = require('../db');

const VALID_WEBSITE_STATUSES = ['no_website', 'facebook_only', 'outdated', 'not_mobile_friendly', 'slow', 'missing_contact_info', 'unknown'];
const VALID_PIPELINE_STATUSES = ['found', 'mockup_made', 'emailed', 'replied', 'won', 'rejected'];

function sanitizeString(val) {
  if (val === undefined || val === null) return null;
  return String(val).trim().slice(0, 2000);
}

function validateLead(body) {
  const errors = [];
  if (!body.business_name || !String(body.business_name).trim()) {
    errors.push('business_name is required');
  }
  if (body.website_status && !VALID_WEBSITE_STATUSES.includes(body.website_status)) {
    errors.push(`website_status must be one of: ${VALID_WEBSITE_STATUSES.join(', ')}`);
  }
  if (body.pipeline_status && !VALID_PIPELINE_STATUSES.includes(body.pipeline_status)) {
    errors.push(`pipeline_status must be one of: ${VALID_PIPELINE_STATUSES.join(', ')}`);
  }
  if (body.lead_score !== undefined && (isNaN(Number(body.lead_score)) || Number(body.lead_score) < 0 || Number(body.lead_score) > 100)) {
    errors.push('lead_score must be between 0 and 100');
  }
  return errors;
}

// GET /api/leads/export/csv  (must be before /:id)
router.get('/export/csv', (req, res) => {
  const { search, suburb, industry, pipeline_status, score_min, score_max } = req.query;

  let query = 'SELECT * FROM leads WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (business_name LIKE ? OR suburb LIKE ? OR notes LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }
  if (suburb) { query += ' AND suburb = ?'; params.push(suburb); }
  if (industry) { query += ' AND industry = ?'; params.push(industry); }
  if (pipeline_status) { query += ' AND pipeline_status = ?'; params.push(pipeline_status); }
  if (score_min !== undefined && score_min !== '') { query += ' AND lead_score >= ?'; params.push(Number(score_min)); }
  if (score_max !== undefined && score_max !== '') { query += ' AND lead_score <= ?'; params.push(Number(score_max)); }

  const leads = db.prepare(query).all(...params);

  const headers = ['id', 'business_name', 'industry', 'suburb', 'website_url', 'email', 'phone', 'website_status', 'lead_score', 'pipeline_status', 'last_contacted_at', 'created_at', 'notes'];
  const escape = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = [headers.join(',')];
  for (const lead of leads) {
    rows.push(headers.map(h => escape(lead[h])).join(','));
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
  res.send(rows.join('\n'));
});

// GET /api/leads
router.get('/', (req, res) => {
  const { search, suburb, industry, pipeline_status, score_min, score_max, sort, order } = req.query;

  let query = 'SELECT * FROM leads WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (business_name LIKE ? OR suburb LIKE ? OR notes LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }
  if (suburb) {
    query += ' AND suburb = ?';
    params.push(suburb);
  }
  if (industry) {
    query += ' AND industry = ?';
    params.push(industry);
  }
  if (pipeline_status) {
    query += ' AND pipeline_status = ?';
    params.push(pipeline_status);
  }
  if (score_min !== undefined) {
    query += ' AND lead_score >= ?';
    params.push(Number(score_min));
  }
  if (score_max !== undefined) {
    query += ' AND lead_score <= ?';
    params.push(Number(score_max));
  }

  const validSorts = ['business_name', 'industry', 'suburb', 'lead_score', 'pipeline_status', 'created_at', 'last_contacted_at'];
  const sortCol = validSorts.includes(sort) ? sort : 'created_at';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
  query += ` ORDER BY ${sortCol} ${sortOrder}`;

  const leads = db.prepare(query).all(...params);
  res.json(leads);
});

// GET /api/leads/:id
router.get('/:id', (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  res.json(lead);
});

// POST /api/leads
router.post('/', (req, res) => {
  const errors = validateLead(req.body);
  if (errors.length) return res.status(400).json({ errors });

  const {
    business_name, industry, suburb, website_url, email, phone,
    notes, website_status, lead_score, pipeline_status
  } = req.body;

  const stmt = db.prepare(`
    INSERT INTO leads (business_name, industry, suburb, website_url, email, phone, notes, website_status, lead_score, pipeline_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    sanitizeString(business_name),
    sanitizeString(industry),
    sanitizeString(suburb),
    sanitizeString(website_url),
    sanitizeString(email),
    sanitizeString(phone),
    sanitizeString(notes),
    website_status || 'unknown',
    lead_score ? Number(lead_score) : 0,
    pipeline_status || 'found'
  );

  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(lead);
});

// PUT /api/leads/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Lead not found' });

  const errors = validateLead({ ...existing, ...req.body });
  if (errors.length) return res.status(400).json({ errors });

  const {
    business_name, industry, suburb, website_url, email, phone,
    notes, website_status, lead_score, pipeline_status
  } = req.body;

  let last_contacted_at = existing.last_contacted_at;
  if (pipeline_status === 'emailed' && existing.pipeline_status !== 'emailed') {
    last_contacted_at = new Date().toISOString();
  }

  db.prepare(`
    UPDATE leads SET
      business_name = ?, industry = ?, suburb = ?, website_url = ?,
      email = ?, phone = ?, notes = ?, website_status = ?, lead_score = ?,
      pipeline_status = ?, last_contacted_at = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    sanitizeString(business_name) ?? existing.business_name,
    sanitizeString(industry) ?? existing.industry,
    sanitizeString(suburb) ?? existing.suburb,
    sanitizeString(website_url) ?? existing.website_url,
    sanitizeString(email) ?? existing.email,
    sanitizeString(phone) ?? existing.phone,
    sanitizeString(notes) ?? existing.notes,
    website_status ?? existing.website_status,
    lead_score !== undefined ? Number(lead_score) : existing.lead_score,
    pipeline_status ?? existing.pipeline_status,
    last_contacted_at,
    req.params.id
  );

  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  res.json(lead);
});

// DELETE /api/leads/:id
router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Lead not found' });
  db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// GET /api/leads/:id/audits
router.get('/:id/audits', (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  const audits = db.prepare('SELECT * FROM website_audits WHERE lead_id = ? ORDER BY audited_at DESC').all(req.params.id);
  res.json(audits);
});

module.exports = router;
