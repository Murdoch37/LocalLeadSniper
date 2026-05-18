const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const CURRENT_YEAR = new Date().getFullYear();
const FETCH_TIMEOUT = 5000;

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const start = Date.now();
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LocalLeadSniper/1.0)' },
      redirect: 'follow',
    });
    const elapsed = Date.now() - start;
    return { res, elapsed };
  } finally {
    clearTimeout(timer);
  }
}

function inferWebsiteStatus(checks) {
  if (checks.fetchFailed) return 'no_website';
  if (!checks.hasHttps) return 'outdated';
  if (!checks.hasViewport) return 'not_mobile_friendly';
  if (checks.slowLoad) return 'slow';
  if (!checks.hasContactLink) return 'missing_contact_info';
  return 'unknown';
}

async function auditWebsite(url) {
  if (!url || !url.trim()) {
    return {
      score: 50,
      website_status: 'no_website',
      checks: { noWebsite: { points: 50, failed: true, label: 'No website on file' } },
    };
  }

  let normalizedUrl = url.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) normalizedUrl = 'https://' + normalizedUrl;

  const checks = {
    noHttps:          { points: 15, failed: false, label: 'No HTTPS' },
    noViewport:       { points: 20, failed: false, label: 'No mobile viewport meta tag' },
    noTitleOrDesc:    { points: 10, failed: false, label: 'No <title> or meta description' },
    noContactLink:    { points: 10, failed: false, label: 'No contact page link' },
    noBookingLink:    { points: 5,  failed: false, label: 'No booking/appointment link' },
    noSocialLinks:    { points: 5,  failed: false, label: 'No social media links' },
    oldCopyright:     { points: 10, failed: false, label: `Copyright year older than ${CURRENT_YEAR - 2}` },
    slowLoad:         { points: 12, failed: false, label: 'Page load > 3 seconds' },
    fetchFailed:      { points: 40, failed: false, label: 'Site unreachable or fetch failed' },
  };

  let html = '';
  let elapsed = 0;

  try {
    const { res, elapsed: ms } = await fetchWithTimeout(normalizedUrl);
    elapsed = ms;

    if (!normalizedUrl.startsWith('https://')) {
      checks.noHttps.failed = true;
    }

    if (elapsed > 3000) checks.slowLoad.failed = true;

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      checks.fetchFailed.failed = true;
    } else {
      html = await res.text();
    }
  } catch (err) {
    checks.fetchFailed.failed = true;
  }

  if (!checks.fetchFailed.failed && html) {
    const $ = cheerio.load(html);

    if (!/^https/i.test(normalizedUrl)) checks.noHttps.failed = true;

    const viewport = $('meta[name="viewport"]').attr('content');
    if (!viewport) checks.noViewport.failed = true;

    const title = $('title').text().trim();
    const desc = $('meta[name="description"]').attr('content');
    if (!title && !desc) checks.noTitleOrDesc.failed = true;

    const bodyText = $('body').html() || '';
    if (!/contact/i.test(bodyText)) checks.noContactLink.failed = true;
    if (!/book|appointment/i.test(bodyText)) checks.noBookingLink.failed = true;
    if (!/facebook\.com|instagram\.com|linkedin\.com|twitter\.com|tiktok\.com/i.test(bodyText)) checks.noSocialLinks.failed = true;

    const copyrightMatch = bodyText.match(/©\s*(\d{4})|copyright\s*©?\s*(\d{4})/i);
    if (copyrightMatch) {
      const year = parseInt(copyrightMatch[1] || copyrightMatch[2]);
      if (year < CURRENT_YEAR - 2) checks.oldCopyright.failed = true;
    }
  }

  const score = Math.min(100, Object.values(checks).filter(c => c.failed).reduce((sum, c) => sum + c.points, 0));
  const website_status = inferWebsiteStatus({
    fetchFailed: checks.fetchFailed.failed,
    hasHttps: !checks.noHttps.failed,
    hasViewport: !checks.noViewport.failed,
    slowLoad: checks.slowLoad.failed,
    hasContactLink: !checks.noContactLink.failed,
  });

  return { score, website_status, checks, elapsed, url: normalizedUrl };
}

// POST /api/leads/:id/audit
router.post('/', async (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  try {
    const result = await auditWebsite(lead.website_url);

    db.prepare(`
      INSERT INTO website_audits (lead_id, audit_json) VALUES (?, ?)
    `).run(lead.id, JSON.stringify(result));

    db.prepare(`
      UPDATE leads SET lead_score = ?, website_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(result.score, result.website_status, lead.id);

    const updatedLead = db.prepare('SELECT * FROM leads WHERE id = ?').get(lead.id);
    res.json({ audit: result, lead: updatedLead });
  } catch (err) {
    console.error('Audit error:', err);
    res.status(500).json({ error: 'Audit failed unexpectedly' });
  }
});

module.exports = router;
