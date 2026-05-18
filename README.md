# Local Lead Sniper

A personal CRM for finding local businesses with weak web presence, generating mock redesigns, and drafting personalised outreach emails.

## Stack

- **Frontend**: React + Vite + Tailwind CSS v4
- **Backend**: Node.js + Express
- **Database**: SQLite (via better-sqlite3)

## Features

- **CRM Core**: Add/edit/delete leads, sortable table, filters (suburb, industry, pipeline status, score range), search, CSV export
- **Website Audit**: Server-side fetch + scoring (10 checks, score 0–100), stored per lead
- **Email Generator**: 4 tone variants × 2 email types (initial + follow-up), compliance banner, copy protection until sender fields filled
- **Mock Redesign**: Industry-specific HTML templates, live iframe preview, export as standalone `.html`, copy preview link
- **Dashboard**: Stats, pipeline breakdown, recent leads

## Setup

```bash
npm run install:all   # Install root + server + client deps
npm run dev           # Start both server (3001) and client (5173)
```

## Keyboard Shortcuts

- `N` — Open "New Lead" modal from anywhere

## Project Structure

```
/server     Express API + SQLite + audit/email/mockup logic
/client     Vite + React + Tailwind UI
/data       SQLite DB (gitignored)
/mockups    Exported HTML mockups (gitignored)
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/leads` | List leads (with filters) |
| POST | `/api/leads` | Create lead |
| PUT | `/api/leads/:id` | Update lead |
| DELETE | `/api/leads/:id` | Delete lead |
| GET | `/api/leads/export/csv` | Export filtered leads as CSV |
| POST | `/api/leads/:id/audit` | Run website quality audit |
| POST | `/api/leads/:id/email` | Generate outreach emails |
| POST | `/api/leads/:id/mockup` | Generate mock redesign |
| GET | `/api/stats` | Dashboard statistics |

## Compliance Note

This tool generates email **drafts only** — no SMTP integration, no bulk sending. All generated emails include sender identification and unsubscribe placeholders per Australian Spam Act 2003 requirements.
