const express = require('express');
const cors = require('cors');
const proxyRouter = require('./routes/proxy');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.static(path.join(__dirname, 'public'))); // serve index.html etc.

// Serve the districts list
app.get('/districts.json', async (req, res) => {
  const districts = require('./data/districts.json');
  res.json(districts);
});

// Proxy endpoint (optional)
app.use('/api', proxyRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Link‑tester listening on http://localhost:\${PORT}`);
});
