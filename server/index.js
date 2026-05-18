const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve mockup files
const mockupsDir = path.join(__dirname, '..', 'mockups');
if (!fs.existsSync(mockupsDir)) fs.mkdirSync(mockupsDir, { recursive: true });
app.use('/mockups', express.static(mockupsDir));

// Routes
const leadsRouter = require('./routes/leads');
const auditRouter = require('./routes/audit');
const emailRouter = require('./routes/email');
const mockupRouter = require('./routes/mockup');
const statsRouter = require('./routes/stats');
const discoverRouter = require('./routes/discover');

app.use('/api/stats', statsRouter);
app.use('/api/discover', discoverRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/leads/:id/audit', auditRouter);
app.use('/api/leads/:id/email', emailRouter);
app.use('/api/leads/:id/mockup', mockupRouter);

// Serve built client in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Local Lead Sniper server running on http://localhost:${PORT}`);
});
