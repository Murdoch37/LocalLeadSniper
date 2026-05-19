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
  bakery: 'retail', butcher: 'retail', clothes: 'retail', electronics: 'retail',
  florist: 'retail', furniture: 'retail', gift: 'retail', hardware: 'retail',
  jewelry: 'retail', mobile_phone: 'retail', shoes: 'retail', supermarket: 'retail',
  toys: 'retail', pet: 'retail', sports: 'retail', books: 'retail',
  convenience: 'retail', greengrocer: 'retail', deli: 'retail', seafood: 'retail',
  plumber: 'tradie', electrician: 'tradie', carpenter: 'tradie',
  painter: 'tradie', builder: 'tradie', roofer: 'tradie', hvac: 'tradie',
  landscaper: 'tradie', mason: 'tradie', glazier: 'tradie',
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

function normaliseWebsite(url) {
  if (!url) return null;
  const t = url.trim();
  return /^https?:\/\//i.test(t) ? t : 'https://' + t;
}

async function geocodeSuburb(suburb) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(suburb + ', Australia')}&format=json&limit=3&addressdetails=1`;
  console.log('[discover] geocoding:', url);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'LocalLeadSniper/1.0' },
    timeout: 10000,
  });
  console.log('[discover] nominatim status:', res.status);
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const results = await res.json();
  console.log('[discover] nominatim results:', results.length);
  if (!results.length) return null;
  const preferred = results.find(r =>
    ['suburb', 'town', 'village', 'neighbourhood', 'quarter', 'city_district'].includes(r.type)
  ) || results[0];
  const bbox = preferred.boundingbox; // [south, north, west, east]
  return {
    lat: parseFloat(preferred.lat),
    lon: parseFloat(preferred.lon),
    south: parseFloat(bbox[0]),
    north: parseFloat(bbox[1]),
    west: parseFloat(bbox[2]),
    east: parseFloat(bbox[3]),
    displayName: preferred.display_name,
  };
}

function buildQuery(geo) {
  // Use bbox — shorter and more reliable than around:radius
  const bbox = `${geo.south},${geo.west},${geo.north},${geo.east}`;
  return `[out:json][timeout:25][bbox:${bbox}];
(
  node["name"]["amenity"~"^(restaurant|cafe|bar|pub|fast_food|dentist|doctors|pharmacy|beauty|hairdresser|car_repair|veterinary|clinic|optician|massage)$"];
  node["name"]["shop"];
  node["name"]["craft"];
  node["name"]["office"];
);
out body;`;
}

async function overpassQuery(query) {
  console.log('[discover] overpass query length:', query.length);

  // Use https module directly to avoid node-fetch encoding quirks
  const https = require('https');
  const querystring = require('querystring');
  const postData = querystring.stringify({ data: query });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'overpass-api.de',
      path: '/api/interpreter',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'LocalLeadSniper/1.0',
      },
    }, (res) => {
      console.log('[discover] overpass status:', res.statusCode);
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        console.log('[discover] overpass body length:', body.length, 'first 100:', body.slice(0, 100));
        if (res.statusCode !== 200) {
          return reject(new Error(`Overpass returned ${res.statusCode}: ${body.slice(0, 150)}`));
        }
        if (!body.trim()) {
          return reject(new Error('Overpass returned empty body'));
        }
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error(`Overpass non-JSON response: ${body.slice(0, 150)}`));
        }
      });
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Overpass request timed out'));
    });

    req.on('error', (e) => reject(new Error(`Overpass network error: ${e.message}`)));
    req.write(postData);
    req.end();
  });
}

// POST /api/discover
router.post('/', async (req, res) => {
  try {
    const { suburb, categories = [] } = req.body;
    console.log('[discover] search request:', { suburb, categories });

    if (!suburb || !suburb.trim()) {
      return res.status(400).json({ error: 'suburb is required' });
    }

    // Geocode
    let geo = null;
    try {
      geo = await geocodeSuburb(suburb.trim());
    } catch (err) {
      console.error('[discover] geocode failed:', err.message);
    }

    if (!geo) {
      return res.status(404).json({
        error: `Could not find "${suburb}" on the map. Try just the suburb name without the state, e.g. "Fitzroy" or "Newtown".`,
      });
    }

    // Query Overpass
    let osmData;
    try {
      const query = buildQuery(geo);
      osmData = await overpassQuery(query);
    } catch (err) {
      console.error('[discover] overpass failed:', err.message);
      return res.status(502).json({ error: `Map data error: ${err.message}` });
    }

    // Process results
    const elements = osmData.elements || [];
    console.log('[discover] raw elements:', elements.length);

    const seen = new Set();
    const businesses = [];

    for (const el of elements) {
      const tags = el.tags || {};
      const name = tags.name?.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      // Filter by category if specified
      const industry = osmTagsToIndustry(tags);
      if (categories.length > 0 && industry && !categories.includes(industry)) continue;

      const website = normaliseWebsite(tags.website || tags['contact:website'] || tags.url || null);
      const phone = tags.phone || tags['contact:phone'] || tags['contact:mobile'] || null;
      const email = tags.email || tags['contact:email'] || null;
      const facebook = tags['contact:facebook'] || tags.facebook || null;

      let websiteStatus = 'unknown';
      if (!website) websiteStatus = facebook ? 'facebook_only' : 'no_website';

      businesses.push({ business_name: name, suburb: suburb.trim(), industry, website_url: website, phone, email, website_status: websiteStatus, facebook });
    }

    const order = { no_website: 0, facebook_only: 1, unknown: 2 };
    businesses.sort((a, b) => (order[a.website_status] ?? 3) - (order[b.website_status] ?? 3));

    console.log('[discover] returning', businesses.length, 'businesses');
    return res.json({ results: businesses, total: businesses.length, suburb: suburb.trim(), geocoded: geo.displayName });

  } catch (err) {
    console.error('[discover] unhandled error:', err);
    return res.status(500).json({ error: `Unexpected error: ${err.message}` });
  }
});

// POST /api/discover/import
router.post('/import', async (req, res) => {
  try {
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
        biz.business_name.trim(), biz.industry || null, biz.suburb || null,
        biz.website_url || null, biz.email || null, biz.phone || null,
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

    return res.json({
      results,
      imported: results.filter(r => r.status === 'imported').length,
      skipped: results.filter(r => r.status === 'skipped').length,
    });
  } catch (err) {
    console.error('[discover/import] unhandled error:', err);
    return res.status(500).json({ error: `Unexpected error: ${err.message}` });
  }
});

module.exports = router;
