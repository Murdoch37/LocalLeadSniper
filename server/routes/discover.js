const express = require('express');
const router = express.Router();
const db = require('../db');
const fetch = require('node-fetch');

// Overpass API OSM tag → our industry mapping
const TAG_TO_INDUSTRY = {
  // amenity tags
  restaurant: 'hospitality',
  cafe: 'hospitality',
  bar: 'hospitality',
  pub: 'hospitality',
  fast_food: 'hospitality',
  food_court: 'hospitality',
  ice_cream: 'hospitality',
  dentist: 'health',
  doctors: 'health',
  clinic: 'health',
  pharmacy: 'health',
  optician: 'health',
  physiotherapist: 'health',
  veterinary: 'health',
  beauty: 'beauty',
  hairdresser: 'beauty',
  nail_salon: 'beauty',
  car_repair: 'automotive',
  car_wash: 'automotive',
  fuel: 'automotive',
  school: 'education',
  kindergarten: 'education',
  college: 'education',
  // shop tags
  bakery: 'retail',
  butcher: 'retail',
  clothes: 'retail',
  electronics: 'retail',
  florist: 'retail',
  furniture: 'retail',
  gift: 'retail',
  hardware: 'retail',
  jewelry: 'retail',
  mobile_phone: 'retail',
  shoes: 'retail',
  supermarket: 'retail',
  toys: 'retail',
  pet: 'retail',
  sports: 'retail',
  books: 'retail',
  convenience: 'retail',
  // craft/trade tags
  plumber: 'tradie',
  electrician: 'tradie',
  carpenter: 'tradie',
  painter: 'tradie',
  builder: 'tradie',
  roofer: 'tradie',
  hvac: 'tradie',
  landscaper: 'tradie',
  // office tags
  accountant: 'professional services',
  lawyer: 'professional services',
  financial: 'professional services',
  insurance: 'professional services',
  architect: 'professional services',
  estate_agent: 'professional services',
};

function osmTagsToIndustry(tags) {
  for (const [key, val] of Object.entries(tags)) {
    const mapped = TAG_TO_INDUSTRY[val];
    if (mapped) return mapped;
    if (key === 'craft') return 'tradie';
    if (key === 'office') return 'professional services';
    if (key === 'shop') return 'retail';
    if (key === 'amenity' && (val === 'restaurant' || val === 'cafe' || val === 'bar')) return 'hospitality';
  }
  return null;
}

function buildOverpassQuery(suburb, country, categories) {
  // We search for nodes/ways with relevant tags in a named area
  const areaName = country === 'AU' ? `${suburb}, Australia` : suburb;

  // Build tag filters
  const tagFilters = categories.length > 0
    ? categories.flatMap(cat => {
        const osmTags = getOsmTagsForCategory(cat);
        return osmTags;
      })
    : [
        'node["amenity"~"restaurant|cafe|bar|pub|fast_food|dentist|doctors|clinic|pharmacy|beauty|hairdresser|car_repair|veterinary"](area.searchArea);',
        'node["shop"](area.searchArea);',
        'node["craft"](area.searchArea);',
        'node["office"](area.searchArea);',
      ];

  return `
[out:json][timeout:30];
area[name="${suburb}"]->.searchArea;
(
${tagFilters.join('\n')}
);
out body;
  `.trim();
}

function getOsmTagsForCategory(cat) {
  const map = {
    hospitality: [
      'node["amenity"~"restaurant|cafe|bar|pub|fast_food|food_court|ice_cream"](area.searchArea);',
    ],
    health: [
      'node["amenity"~"dentist|doctors|clinic|pharmacy|optician|physiotherapist|veterinary"](area.searchArea);',
    ],
    beauty: [
      'node["amenity"~"beauty|hairdresser|nail_salon"](area.searchArea);',
    ],
    retail: [
      'node["shop"](area.searchArea);',
    ],
    tradie: [
      'node["craft"](area.searchArea);',
      'node["amenity"~"car_repair|car_wash"](area.searchArea);',
    ],
    'professional services': [
      'node["office"](area.searchArea);',
    ],
    automotive: [
      'node["amenity"~"car_repair|car_wash|fuel"](area.searchArea);',
      'node["shop"~"car|motorcycle|tyres"](area.searchArea);',
    ],
  };
  return map[cat] || ['node["name"](area.searchArea);'];
}

function normaliseWebsite(url) {
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) return 'https://' + url;
  return url;
}

// POST /api/discover
router.post('/', async (req, res) => {
  const { suburb, categories = [] } = req.body;

  if (!suburb || !suburb.trim()) {
    return res.status(400).json({ error: 'suburb is required' });
  }

  const query = buildOverpassQuery(suburb.trim(), 'AU', categories);

  let osmData;
  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      timeout: 35000,
    });

    if (!response.ok) {
      return res.status(502).json({ error: `Overpass API error: ${response.status}` });
    }

    osmData = await response.json();
  } catch (err) {
    if (err.name === 'AbortError' || err.type === 'request-timeout') {
      return res.status(504).json({ error: 'Search timed out — try a more specific suburb name' });
    }
    return res.status(502).json({ error: `Could not reach Overpass API: ${err.message}` });
  }

  const elements = osmData.elements || [];

  // Deduplicate by name+suburb and filter out unnamed
  const seen = new Set();
  const businesses = [];

  for (const el of elements) {
    const tags = el.tags || {};
    const name = tags.name;
    if (!name || name.trim() === '') continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const website = normaliseWebsite(tags.website || tags['contact:website'] || tags.url || null);
    const phone = tags.phone || tags['contact:phone'] || tags['contact:mobile'] || null;
    const email = tags.email || tags['contact:email'] || null;
    const industry = osmTagsToIndustry(tags);

    // Determine web presence weakness
    let websiteStatus = 'unknown';
    if (!website) {
      const hasFb = tags['contact:facebook'] || tags.facebook;
      websiteStatus = hasFb ? 'facebook_only' : 'no_website';
    }

    businesses.push({
      business_name: name,
      suburb: suburb.trim(),
      industry,
      website_url: website,
      phone,
      email,
      website_status: websiteStatus,
      osm_id: el.id,
      facebook: tags['contact:facebook'] || tags.facebook || null,
    });
  }

  // Sort: no_website first, then facebook_only, then unknown
  const order = { no_website: 0, facebook_only: 1, unknown: 2 };
  businesses.sort((a, b) => (order[a.website_status] ?? 3) - (order[b.website_status] ?? 3));

  res.json({ results: businesses, total: businesses.length, suburb: suburb.trim() });
});

// POST /api/discover/import — bulk import selected businesses as leads + auto-audit
router.post('/import', async (req, res) => {
  const { businesses } = req.body;
  if (!Array.isArray(businesses) || businesses.length === 0) {
    return res.status(400).json({ error: 'businesses array is required' });
  }

  // Lazy-load audit function to avoid circular deps
  const { auditWebsite } = require('./audit-fn');

  const results = [];

  for (const biz of businesses) {
    if (!biz.business_name || !String(biz.business_name).trim()) continue;

    // Skip if already exists (same name + suburb)
    const existing = db.prepare(
      'SELECT id FROM leads WHERE LOWER(business_name) = LOWER(?) AND LOWER(COALESCE(suburb,"")) = LOWER(?)'
    ).get(biz.business_name.trim(), (biz.suburb || '').trim());

    if (existing) {
      results.push({ business_name: biz.business_name, status: 'skipped', reason: 'already exists', id: existing.id });
      continue;
    }

    const stmt = db.prepare(`
      INSERT INTO leads (business_name, industry, suburb, website_url, email, phone, website_status, lead_score, pipeline_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'found')
    `);

    const r = stmt.run(
      biz.business_name.trim(),
      biz.industry || null,
      biz.suburb || null,
      biz.website_url || null,
      biz.email || null,
      biz.phone || null,
      biz.website_status || 'unknown'
    );

    const leadId = r.lastInsertRowid;

    // Auto-audit
    try {
      const auditResult = await auditWebsite(biz.website_url);
      db.prepare('INSERT INTO website_audits (lead_id, audit_json) VALUES (?, ?)').run(leadId, JSON.stringify(auditResult));
      db.prepare('UPDATE leads SET lead_score = ?, website_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(auditResult.score, auditResult.website_status, leadId);
      results.push({ business_name: biz.business_name, status: 'imported', id: leadId, score: auditResult.score, website_status: auditResult.website_status });
    } catch {
      results.push({ business_name: biz.business_name, status: 'imported', id: leadId, score: 0 });
    }
  }

  res.json({ results, imported: results.filter(r => r.status === 'imported').length, skipped: results.filter(r => r.status === 'skipped').length });
});

module.exports = router;
