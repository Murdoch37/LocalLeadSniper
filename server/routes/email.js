const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');

const INDUSTRY_ISSUES = {
  tradie: 'no online booking or quote request form',
  hospitality: 'no menu or reservation system visible',
  retail: 'no product listings or online store',
  'professional services': 'no clear service descriptions or credentials',
  default: 'outdated design and poor mobile experience',
};

function getTopIssue(lead) {
  const status = lead.website_status;
  if (status === 'no_website') return 'no website at all';
  if (status === 'facebook_only') return 'relying solely on a Facebook page';
  if (status === 'not_mobile_friendly') return 'a site that isn\'t mobile-friendly';
  if (status === 'slow') return 'a slow-loading website driving customers away';
  if (status === 'missing_contact_info') return 'missing contact information on the website';
  if (status === 'outdated') return 'an outdated website design';
  const industry = (lead.industry || '').toLowerCase();
  return INDUSTRY_ISSUES[industry] || INDUSTRY_ISSUES.default;
}

const templates = {
  friendly: {
    initial: ({ business_name, suburb, top_issue, sender_name, sender_business, sender_email }) => `Subject: Quick thought about ${business_name}'s online presence

Hi there,

I was browsing around ${suburb} recently and came across ${business_name} — love what you do!

I noticed ${top_issue}, and I thought I'd reach out because I genuinely think you're leaving customers on the table. A lot of great local businesses like yours miss out simply because their online presence doesn't reflect how good they actually are.

I put together a quick mock redesign to show what ${business_name} could look like with a modern site — no strings attached, just wanted to share the idea.

Would you be open to a quick 10-minute chat?

Cheers,
${sender_name}
${sender_business}
${sender_email}

---
This email was sent to you because your business operates in ${suburb} and may benefit from web services. To unsubscribe from future emails from ${sender_name} at ${sender_business}, reply with "unsubscribe" or email ${sender_email}.`,

    follow_up: ({ business_name, suburb, top_issue, sender_name, sender_business, sender_email }) => `Subject: Following up — ${business_name} mock redesign

Hi again,

Just following up on my email from last week about ${business_name}'s web presence.

I know inboxes get busy! I still think there's a real opportunity here around ${top_issue}. The mock redesign I put together takes about 30 seconds to look at — happy to send it through if you're curious.

No pressure at all, just wanted to make sure it didn't get lost.

${sender_name}
${sender_business}
${sender_email}

---
To unsubscribe from future emails from ${sender_name} at ${sender_business}, reply with "unsubscribe" or email ${sender_email}.`,
  },

  casual_aussie: {
    initial: ({ business_name, suburb, top_issue, sender_name, sender_business, sender_email }) => `Subject: Spotted something about ${business_name}'s website

G'day,

Was poking around ${suburb} online and noticed ${business_name} — great local spot!

Thing is, I noticed ${top_issue}. In today's market, that can genuinely cost you customers who are searching online and just go to the next result.

I put together a quick mock of what a fresh site could look like for you. No cost, no commitment — just wanted to show you what's possible.

Keen for a quick yarn about it?

${sender_name}
${sender_business}
${sender_email}

---
Sent because ${business_name} is a local ${suburb} business that may benefit from digital services. To unsubscribe, reply "unsubscribe" or contact ${sender_email}.`,

    follow_up: ({ business_name, suburb, top_issue, sender_name, sender_business, sender_email }) => `Subject: Still keen to help — ${business_name}

Hey,

Shot you an email last week about ${business_name}'s online presence — just wanted to bump this in case it got buried.

The issue around ${top_issue} is pretty fixable, and I've already done the mock so there's nothing for you to organise. Takes 2 minutes to have a look.

Happy to flick it through if you want a squiz.

${sender_name}
${sender_business}
${sender_email}

---
To unsubscribe from future emails, reply "unsubscribe" or email ${sender_email}.`,
  },

  professional: {
    initial: ({ business_name, suburb, top_issue, sender_name, sender_business, sender_email }) => `Subject: Web Presence Opportunity for ${business_name}

Dear ${business_name} Team,

I am writing to introduce ${sender_business} and to share an observation regarding ${business_name}'s current digital presence.

During a review of businesses operating in ${suburb}, I identified that ${business_name} may be experiencing ${top_issue}. In an increasingly digital marketplace, this can significantly impact customer acquisition and retention.

To demonstrate our capabilities and the potential value we could deliver, we have prepared a complimentary concept redesign for ${business_name}. We would welcome the opportunity to present this to you at your convenience.

Please do not hesitate to contact me to arrange a brief discussion.

Regards,
${sender_name}
${sender_business}
${sender_email}

---
${sender_name} | ${sender_business} | ${sender_email}
This communication is directed to ${business_name} as a business entity in relation to your business operations. To unsubscribe from future correspondence, please reply with "unsubscribe" or contact ${sender_email}.`,

    follow_up: ({ business_name, suburb, top_issue, sender_name, sender_business, sender_email }) => `Subject: Follow-Up: Web Presence Proposal for ${business_name}

Dear ${business_name} Team,

I am following up on my previous correspondence regarding ${business_name}'s digital presence in ${suburb}.

I appreciate that you are busy running your business. To reiterate, we have identified ${top_issue} as a key area for improvement and have prepared a concept redesign at no cost to you.

I would be grateful for 10 minutes of your time to share our findings. Please let me know if that would be possible.

Regards,
${sender_name}
${sender_business}
${sender_email}

---
To unsubscribe from future correspondence, reply "unsubscribe" or email ${sender_email}.`,
  },

  direct: {
    initial: ({ business_name, suburb, top_issue, sender_name, sender_business, sender_email }) => `Subject: Free mock redesign for ${business_name}

Hi — ${business_name} has ${top_issue}, which is costing you customers in ${suburb}. I've built a free mock redesign. Worth a look? Reply yes and I'll send it through.

${sender_name}, ${sender_business} | ${sender_email}

---
B2B service email. To unsubscribe: reply "unsubscribe" or email ${sender_email}.`,

    follow_up: ({ business_name, suburb, top_issue, sender_name, sender_business, sender_email }) => `Subject: Still here — ${business_name} mock redesign

Hi — following up. The mock for ${business_name} (${top_issue}) is ready whenever you want it. One reply needed.

${sender_name}, ${sender_business} | ${sender_email}

---
To unsubscribe: reply "unsubscribe" or email ${sender_email}.`,
  },
};

// POST /api/leads/:id/email
router.post('/', (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const { tone, sender_name, sender_business, sender_email } = req.body;

  if (!tone || !templates[tone]) {
    return res.status(400).json({ error: `tone must be one of: ${Object.keys(templates).join(', ')}` });
  }
  if (!sender_name || !String(sender_name).trim()) {
    return res.status(400).json({ error: 'sender_name is required' });
  }
  if (!sender_business || !String(sender_business).trim()) {
    return res.status(400).json({ error: 'sender_business is required' });
  }
  if (!sender_email || !String(sender_email).trim()) {
    return res.status(400).json({ error: 'sender_email is required' });
  }

  const vars = {
    business_name: lead.business_name,
    suburb: lead.suburb || 'your area',
    top_issue: getTopIssue(lead),
    sender_name: String(sender_name).trim(),
    sender_business: String(sender_business).trim(),
    sender_email: String(sender_email).trim(),
  };

  const tmpl = templates[tone];
  res.json({
    initial: tmpl.initial(vars),
    follow_up: tmpl.follow_up(vars),
    vars,
    tone,
  });
});

module.exports = router;
