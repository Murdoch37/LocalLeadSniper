const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');
const { auditWebsite } = require('./audit-fn');

// POST /api/leads/:id/audit
router.post('/', async (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  try {
    const result = await auditWebsite(lead.website_url);

    db.prepare('INSERT INTO website_audits (lead_id, audit_json) VALUES (?, ?)')
      .run(lead.id, JSON.stringify(result));

    db.prepare('UPDATE leads SET lead_score = ?, website_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(result.score, result.website_status, lead.id);

    const updatedLead = db.prepare('SELECT * FROM leads WHERE id = ?').get(lead.id);
    res.json({ audit: result, lead: updatedLead });
  } catch (err) {
    console.error('Audit error:', err);
    res.status(500).json({ error: 'Audit failed unexpectedly' });
  }
});

module.exports = router;
