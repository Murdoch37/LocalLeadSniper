const express = require('express');
const router = express.Router();
const db = require('../db');
const fetch = require('node-fetch');

const TAG_TO_INDUSTRY = {
  restaurant: 'hospitality', cafe: 'hospitality', bar: 'hospitality',
  pub: 'hospitality', fast_food: 'hospitality', food_court: 'hospitality',
  ice_cream: 'hospitality', bistro: 'hospitality',
  dentist: 'health', doctors: 'health', clinic: 'health',
  pharmacy: 'health', optician: 'health', physiotherapist: 'health',
  veterinary: 'health', medical_centre: 'health',
  beauty: 'beauty', hairdresser: 'beauty', nail_salon: 'beauty', massage: 'beauty',
  car_repair: 'automotive', car_wash: 'automotive', fuel: 'automotive',
  school: 'education', kindergarten: 'education', college: 'education',
  // shop values
  bakery: 'retail', butcher: 'retail', clothes: 'retail', electronics: 'retail',
  florist: 'retail', furniture: 'retail', gift: 'retail', hardware: 'retail',
  jewelry: 'retail', mobile_phone: 'retail', shoes: 'retail', supermarket: 'retail',
  toys: 'retail', pet: 'retail', sports: 'retail', books: 'retail',
  convenience: 'retail', greengrocer: 'retail', deli: 'retail', seafood: 'retail',
  // craft values
  plumber: 'tradie', electrician: 'tradie', carpenter: 'tradie',
  painter: 'tradie', builder: 'tradie', roofer: 'tradie', hvac: 'tradie',
  landscaper: 'tradie', mason: 'tradie', glazier: 'tradie',
  // office values
  accountant: 'professional services', lawyer: 'professional services',
  financial: 'professional services', insurance: 'professional services',
  architect: 'professional services', estate_agent: 'professional services',
  it: 'professional services', advertising: 'professional services',
};

function osmTagsToIndustry(tags) {
  for (const val of Object.values(tags)) {
    if (TAG_TO_INDUSTRY[val]) return TAG_TO_INDUSTRY[val];
  }
  if (tags.craft) return 'tradie';
  if (tags.office) return 'professional services';
  if (tags.shop) return 'retail';
  return null;
}

function buildTagFilters(categories, radius, lat, lon, areaExpr) {
  const geo = areaExpr || `around:${radius},${lat},${lon}`;

  if (categories.length === 0) {
    return [
      `node["name"]["amenity"~"restaurant|cafe|bar|pub|fast_food|dentist|doctors|clinic|pharmacy|beauty|hairdresser|car_repair|veterinary|massage|optician|physiotherapist"](${geo});`,
      `node["name"]["shop"](${geo});`,
      `node["name"]["craft"](${geo});`,
      `node["name"]["office"](${geo});`,
      `way["name"]["amenity"~"restaurant|cafe|bar|pub|fast_food|dentist|doctors|clinic|pharmacy|beauty|hairdresser|car_repair|veterinary"](${geo});`,
      `way["name"]["shop"](${geo});`,
    ];
  }

  const lines = [];
  for (const cat of categories) {
    switch (cat) {
      case 'hospitality':
        lines.push(`node["name"]["amenity"~"restaurant|cafe|bar|pub|fast_food|food_court|ice_cream|bistro"](${geo});`);
        lines.push(`way["name"]["amenity"~"restaurant|cafe|bar|pub|fast_food"](${geo});`);
        break;
      case 'health':
        lines.push(`node["name"]["amenity"~"dentist|doctors|clinic|pharmacy|optician|physiotherapist|veterinary|medical_centre"](${geo});`);
        break;
      case 'beauty':
        lines.push(`node["name"]["amenity"~"beauty|hairdresser|nail_salon|massage"](${geo});`);
        lines.push(`node["name"]["shop"~"beauty|hairdresser|cosmetics|perfumery"](${geo});`);
        break;
      case 'retail':
        lines.push(`node["name"]["shop"](${geo});`);
        lines.push(`way["name"]["shop"](${geo});`);
        break;
      case 'tradie':
        lines.push(`node["name"]["craft"](${geo});`);
        lines.push(`node["name"]["amenity"~"car_repair|car_wash"](${geo});`);
        break;
      case 'professional services':
        lines.push(`node["name"]["office"](${geo});`);
        break;
      case 'automotive':
        lines.push(`node["name"]["amenity"~"car_repair|car_wash|fuel"](${geo});`);
        lines.push(`node["name"]["shop"~"car|motorcycle|tyres|auto"](${geo});`);
        break;
    }
  }
  return lines;
}

async function geocodeSuburb(suburb) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(suburb + ', Australia')}&format=json&limit=3&addressdetails=1`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'LocalLeadSniper/1.0 (local business CRM)' },
    timeout: 10000,
  });
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
  const results = await res.json();
  if (!results.length) return null;

  // Prefer suburb/town/village over broader results
  const preferred = results.find(r =>
    ['suburb', 'town', 'village', 'neighbourhood', 'quarter', 'city_district'].includes(r.type)
  ) || results[0];

  return { lat: parseFloat(preferred.lat), lon: parseFloat(preferred.lon), displayName: preferred.display_name };
}

function normaliseWebsite(url) {
  if (!url) return null;
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return 'https://' + trimmed;
  return trimmed;
}

async function overpassQuery(query) {
  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'data=' + encodeURIComponent(query),
    timeout: 35000,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Overpass error ${response.status}${text ? ': ' + text.slice(0, 200) : ''}`);
  }
  return response.json();
}

function buildAreaFilters(categories, suburb) {
  const areaFilter = `area.searchArea`;
  const cats = categories.length === 0
    ? [
        `node["name"]["amenity"~"restaurant|cafe|bar|pub|fast_food|dentist|doctors|clinic|pharmacy|beauty|hairdresser|car_repair|veterinary|massage|optician|physiotherapist"](${areaFilter});`,
        `node["name"]["shop"](${areaFilter});`,
        `node["name"]["craft"](${areaFilter});`,
        `node["name"]["office"](${areaFilter});`,
        `way["name"]["amenity"~"restaurant|cafe|bar|pub|fast_food|dentist|doctors|clinic"](${areaFilter});`,
        `way["name"]["shop"](${areaFilter});`,
      ]
    : buildTagFilters(categories, null, null, null, areaFilter);

  return `[out:json][timeout:30];
area["name"="${suburb}"]["place"~"suburb|town|village|neighbourhood|city_district"]->.searchArea;
(
${cats.join('\n')}
);
out body;`;
}

// POST /api/discover
router.post('/', async (req, res) => {
  const { suburb, categories = [], radius = 1500 } = req.body;

  if (!suburb || !suburb.trim()) {
    return res.status(400).json({ error: 'suburb is required' });
  }

  // Step 1: geocode via Nominatim, fall back to area-name query
  let geo = null;
  try {
    geo = await geocodeSuburb(suburb.trim());
  } catch {
    // will fall back to area-name query below
  }

  let osmData;

  if (geo) {
    // Radius-based query (more reliable)
    const tagFilters = buildTagFilters(categories, radius, geo.lat, geo.lon);
    const query = `[out:json][timeout:30];\n(\n${tagFilters.join('\n')}\n);\nout body;`;
    try {
      osmData = await overpassQuery(query);
    } catch (err) {
      return res.status(502).json({ error: err.message });
    }
  } else {
    // Fallback: area name query
    const query = buildAreaFilters(categories, suburb.trim());
    try {
      osmData = await overpassQuery(query);
    } catch (err) {
      return res.status(502).json({ error: `Could not find suburb "${suburb}". Try the exact OSM name (e.g. "Fitzroy" not "Fitzroy VIC"). Error: ${err.message}` });
    }
  }

  const elements = osmData.elements || [];

  // Deduplicate by name, filter unnamed
  const seen = new Set();
  const businesses = [];

  for (const el of elements) {
    const tags = el.tags || {};
    const name = tags.name?.trim();
    if (!name) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const website = normaliseWebsite(tags.website || tags['contact:website'] || tags.url || null);
    const phone = tags.phone || tags['contact:phone'] || tags['contact:mobile'] || null;
    const email = tags.email || tags['contact:email'] || null;
    const facebook = tags['contact:facebook'] || tags.facebook || null;
    const industry = osmTagsToIndustry(tags);

    let websiteStatus = 'unknown';
    if (!website) {
      websiteStatus = facebook ? 'facebook_only' : 'no_website';
    }

    businesses.push({ business_name: name, suburb: suburb.trim(), industry, website_url: website, phone, email, website_status, facebook });
  }

  // Sort: no_website → facebook_only → has website
  const order = { no_website: 0, facebook_only: 1, unknown: 2 };
  businesses.sort((a, b) => (order[a.website_status] ?? 3) - (order[b.website_status] ?? 3));

  res.json({ results: businesses, total: businesses.length, suburb: suburb.trim(), geocoded: geo?.displayName || suburb.trim() });
});

// POST /api/discover/import
router.post('/import', async (req, res) => {
  const { businesses } = req.body;
  if (!Array.isArray(businesses) || businesses.length === 0) {
    return res.status(400).json({ error: 'businesses array is required' });
  }

  const { auditWebsite } = require('./audit-fn');
  const results = [];

  for (const biz of businesses) {
    if (!biz.business_name?.trim()) continue;

    const existing = db.prepare(
      'SELECT id FROM leads WHERE LOWER(business_name) = LOWER(?) AND LOWER(COALESCE(suburb,"")) = LOWER(?)'
    ).get(biz.business_name.trim(), (biz.suburb || '').trim());

    if (existing) {
      results.push({ business_name: biz.business_name, status: 'skipped', reason: 'already exists', id: existing.id });
      continue;
    }

    const r = db.prepare(`
      INSERT INTO leads (business_name, industry, suburb, website_url, email, phone, website_status, lead_score, pipeline_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'found')
    `).run(
      biz.business_name.trim(),
      biz.industry || null,
      biz.suburb || null,
      biz.website_url || null,
      biz.email || null,
      biz.phone || null,
      biz.website_status || 'unknown'
    );

    const leadId = r.lastInsertRowid;

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

  res.json({
    results,
    imported: results.filter(r => r.status === 'imported').length,
    skipped: results.filter(r => r.status === 'skipped').length,
  });
});

module.exports = router;
