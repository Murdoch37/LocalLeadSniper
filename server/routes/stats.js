const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM leads').get().count;
  const avgScore = db.prepare('SELECT AVG(lead_score) as avg FROM leads').get().avg || 0;
  const byStatus = db.prepare('SELECT pipeline_status, COUNT(*) as count FROM leads GROUP BY pipeline_status').all();
  const byIndustry = db.prepare('SELECT industry, COUNT(*) as count FROM leads WHERE industry IS NOT NULL GROUP BY industry ORDER BY count DESC LIMIT 5').all();

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const contactedThisWeek = db.prepare(
    'SELECT COUNT(*) as count FROM leads WHERE last_contacted_at >= ?'
  ).get(weekAgo).count;

  const recentLeads = db.prepare(
    'SELECT * FROM leads ORDER BY created_at DESC LIMIT 5'
  ).all();

  res.json({
    total,
    avgScore: Math.round(avgScore),
    byStatus,
    byIndustry,
    contactedThisWeek,
    recentLeads,
  });
});

module.exports = router;
