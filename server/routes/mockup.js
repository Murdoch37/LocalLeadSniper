const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');
const fs = require('fs');
const path = require('path');

const INDUSTRY_DATA = {
  tradie: {
    tagline: 'Quality workmanship you can count on',
    services: ['Residential Repairs', 'Commercial Projects', 'Emergency Call-Outs', 'Free Quotes', 'Insured & Licensed'],
    color: '#f97316',
    about: 'With years of experience serving the local community, we pride ourselves on quality work, fair pricing, and showing up when we say we will.',
  },
  hospitality: {
    tagline: 'Great food, great atmosphere, great memories',
    services: ['Dine In', 'Takeaway', 'Catering', 'Private Events', 'Gift Vouchers'],
    color: '#ec4899',
    about: 'We\'re passionate about bringing the community together over amazing food and drinks. Whether it\'s a quick lunch or a special occasion, we\'ve got you covered.',
  },
  retail: {
    tagline: 'Quality products, local service',
    services: ['In-Store Shopping', 'Online Orders', 'Click & Collect', 'Gift Wrapping', 'Loyalty Program'],
    color: '#8b5cf6',
    about: 'Locally owned and operated, we hand-pick every product with our customers in mind. Stop in and see us — you won\'t leave empty-handed.',
  },
  'professional services': {
    tagline: 'Expert advice you can trust',
    services: ['Initial Consultation', 'Ongoing Support', 'Document Preparation', 'Strategic Planning', 'After-Hours Availability'],
    color: '#0ea5e9',
    about: 'We bring years of professional expertise to every client relationship. Our goal is simple: deliver results that make a real difference to your business or personal situation.',
  },
  default: {
    tagline: 'Serving the local community with pride',
    services: ['Service One', 'Service Two', 'Service Three', 'Consultation', 'Support'],
    color: '#10b981',
    about: 'We\'re proud to serve our local community with dedication, quality, and a personal touch. Get in touch today to find out how we can help you.',
  },
};

function getIndustryData(industry) {
  if (!industry) return INDUSTRY_DATA.default;
  const key = industry.toLowerCase();
  return INDUSTRY_DATA[key] || INDUSTRY_DATA.default;
}

function generateHTML(lead, overrides = {}) {
  const ind = getIndustryData(lead.industry);
  const name = lead.business_name || 'Your Business';
  const suburb = lead.suburb || 'Local Area';
  const phone = lead.phone || '[Your Phone Number]';
  const email = lead.email || '[Your Email Address]';
  const tagline = overrides.tagline || ind.tagline;
  const services = overrides.services || ind.services;
  const about = overrides.about || ind.about;
  const color = ind.color;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${name} — ${suburb}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; color: #1a1a1a; line-height: 1.6; }
  .hero { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #fff; padding: 100px 24px; text-align: center; }
  .hero-badge { display: inline-block; background: ${color}22; color: ${color}; border: 1px solid ${color}44; border-radius: 999px; padding: 4px 16px; font-size: 13px; font-weight: 600; margin-bottom: 20px; letter-spacing: 0.05em; text-transform: uppercase; }
  .hero h1 { font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 800; margin-bottom: 16px; }
  .hero p { font-size: 1.2rem; color: #94a3b8; max-width: 560px; margin: 0 auto 32px; }
  .btn { display: inline-block; background: ${color}; color: #fff; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 1rem; text-decoration: none; transition: opacity 0.2s; }
  .btn:hover { opacity: 0.85; }
  .btn-outline { background: transparent; border: 2px solid #ffffff44; margin-left: 12px; }
  section { padding: 80px 24px; }
  .container { max-width: 1080px; margin: 0 auto; }
  .section-label { text-align: center; color: ${color}; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px; }
  h2 { font-size: clamp(1.6rem, 3vw, 2.4rem); font-weight: 800; text-align: center; margin-bottom: 48px; }
  .services-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
  .service-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px 24px; }
  .service-card h3 { font-size: 1rem; font-weight: 700; margin-bottom: 8px; }
  .service-card p { font-size: 0.875rem; color: #64748b; }
  .service-dot { width: 36px; height: 36px; border-radius: 8px; background: ${color}22; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
  .service-dot svg { width: 18px; height: 18px; fill: ${color}; }
  .about-section { background: #f8fafc; }
  .about-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
  .about-img { background: linear-gradient(135deg, ${color}22, ${color}44); border-radius: 16px; aspect-ratio: 4/3; display: flex; align-items: center; justify-content: center; font-size: 4rem; }
  .about-content p { color: #475569; font-size: 1.05rem; }
  .testimonials { background: #0f172a; color: #fff; }
  .testimonials h2 { color: #fff; }
  .sample-notice { text-align: center; background: #1e293b; color: #64748b; font-size: 12px; padding: 8px; border-radius: 6px; margin-bottom: 32px; }
  .testimonials-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
  .testimonial { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 28px; }
  .testimonial-text { color: #cbd5e1; font-size: 0.95rem; margin-bottom: 20px; font-style: italic; }
  .testimonial-author { display: flex; align-items: center; gap: 12px; }
  .avatar { width: 40px; height: 40px; border-radius: 50%; background: ${color}44; display: flex; align-items: center; justify-content: center; font-weight: 700; color: ${color}; }
  .author-name { font-weight: 600; font-size: 0.9rem; }
  .author-loc { font-size: 0.8rem; color: #64748b; }
  .cta-section { background: linear-gradient(135deg, ${color} 0%, ${color}cc 100%); color: #fff; text-align: center; }
  .cta-section h2 { color: #fff; }
  .contact-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 40px; text-align: left; }
  .contact-item { background: #ffffff22; border-radius: 10px; padding: 20px; }
  .contact-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.7; margin-bottom: 6px; }
  .contact-value { font-weight: 700; font-size: 1.05rem; }
  footer { background: #0f172a; color: #64748b; text-align: center; padding: 32px 24px; font-size: 0.85rem; }
  @media (max-width: 640px) { .about-inner { grid-template-columns: 1fr; } .btn-outline { margin-left: 0; margin-top: 12px; } }
</style>
</head>
<body>

<section class="hero">
  <div class="container">
    <div class="hero-badge">${suburb}</div>
    <h1>${name}</h1>
    <p>${tagline}</p>
    <a href="#contact" class="btn">Get in Touch</a>
    <a href="#services" class="btn btn-outline">Our Services</a>
  </div>
</section>

<section id="services">
  <div class="container">
    <p class="section-label">What We Offer</p>
    <h2>Our Services</h2>
    <div class="services-grid">
      ${services.map(s => `
      <div class="service-card">
        <div class="service-dot"><svg viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
        <h3>${s}</h3>
        <p>Professional, reliable, and tailored to your needs.</p>
      </div>`).join('')}
    </div>
  </div>
</section>

<section class="about-section">
  <div class="container">
    <div class="about-inner">
      <div class="about-img">🏢</div>
      <div class="about-content">
        <p class="section-label">About Us</p>
        <h2 style="text-align:left; margin-bottom: 20px;">About ${name}</h2>
        <p>${about}</p>
      </div>
    </div>
  </div>
</section>

<section class="testimonials">
  <div class="container">
    <p class="section-label">What Customers Say</p>
    <h2>Testimonials</h2>
    <p class="sample-notice">⚠️ Sample testimonials — replace with real reviews before publishing</p>
    <div class="testimonials-grid">
      <div class="testimonial">
        <p class="testimonial-text">"Absolutely fantastic service. ${name} was professional, on time, and delivered exactly what was promised. Highly recommend to anyone in ${suburb}!"</p>
        <div class="testimonial-author"><div class="avatar">S</div><div><div class="author-name">Sarah M.</div><div class="author-loc">${suburb}</div></div></div>
      </div>
      <div class="testimonial">
        <p class="testimonial-text">"We've used ${name} twice now and both times have been exceptional. Great value and outstanding quality — won't go anywhere else."</p>
        <div class="testimonial-author"><div class="avatar">J</div><div><div class="author-name">James T.</div><div class="author-loc">Local resident</div></div></div>
      </div>
      <div class="testimonial">
        <p class="testimonial-text">"Friendly, knowledgeable, and really listened to what we needed. The team at ${name} made the whole process stress-free."</p>
        <div class="testimonial-author"><div class="avatar">L</div><div><div class="author-name">Lisa K.</div><div class="author-loc">${suburb}</div></div></div>
      </div>
    </div>
  </div>
</section>

<section id="contact" class="cta-section">
  <div class="container">
    <h2>Get in Touch</h2>
    <p style="opacity:0.85; font-size:1.1rem;">Ready to get started? Contact us today — we'd love to hear from you.</p>
    <div class="contact-grid">
      <div class="contact-item"><div class="contact-label">Phone</div><div class="contact-value">${phone}</div></div>
      <div class="contact-item"><div class="contact-label">Email</div><div class="contact-value">${email}</div></div>
      <div class="contact-item"><div class="contact-label">Location</div><div class="contact-value">${suburb}</div></div>
    </div>
  </div>
</section>

<footer>
  <p>© ${new Date().getFullYear()} ${name}. All rights reserved. | ${suburb}</p>
  <p style="margin-top:8px; font-size:11px;">This is a concept mockup generated by Local Lead Sniper. Sample content only.</p>
</footer>

</body>
</html>`;
}

// POST /api/leads/:id/mockup
router.post('/', (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const overrides = {
    tagline: req.body.tagline || null,
    services: req.body.services || null,
    about: req.body.about || null,
  };

  const html = generateHTML(lead, overrides);

  const mockupsDir = path.join(__dirname, '..', '..', 'mockups');
  if (!fs.existsSync(mockupsDir)) fs.mkdirSync(mockupsDir, { recursive: true });

  const filename = `${lead.id}.html`;
  fs.writeFileSync(path.join(mockupsDir, filename), html);

  if (lead.pipeline_status === 'found') {
    db.prepare('UPDATE leads SET pipeline_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run('mockup_made', lead.id);
  }

  const updatedLead = db.prepare('SELECT * FROM leads WHERE id = ?').get(lead.id);

  res.json({
    html,
    filename,
    lead: updatedLead,
    industryData: getIndustryData(lead.industry),
  });
});

// GET /api/leads/:id/mockup
router.get('/', (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const ind = getIndustryData(lead.industry);
  res.json({ industryData: ind });
});

module.exports = router;
