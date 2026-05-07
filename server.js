const express = require('express');
const cors = require('cors');
const path = require('path');
const { getLatestSnapshot, getHistoricalSnapshots, getLatestHoldings } = require('./db');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/latest', (req, res) => {
  const snapshot = getLatestSnapshot();
  if (!snapshot) {
    return res.status(404).json({ error: 'No snapshot found' });
  }
  
  const categories = snapshot.categories.map(cat => ({
    name: cat.category_name,
    amount: cat.amount
  }));
  
  res.json({
    totalAssets: snapshot.total_assets,
    categories
  });
});

app.get('/api/holdings/latest', (req, res) => {
  const data = getLatestHoldings();
  if (!data) {
    return res.status(404).json({ error: 'No holdings found' });
  }
  
  const byCategory = {};
  for (const h of data.holdings) {
    if (!byCategory[h.category]) byCategory[h.category] = { holdings: [], totalValuation: 0, totalUnrealizedGain: 0 };
    byCategory[h.category].holdings.push({
      symbol: h.symbol,
      name: h.name,
      valuation: h.valuation,
      unrealizedGain: h.unrealized_gain,
      quantity: h.quantity,
      institution: h.institution
    });
    byCategory[h.category].totalValuation += h.valuation;
    byCategory[h.category].totalUnrealizedGain += (h.unrealized_gain || 0);
  }
  
  res.json({
    scrapedAt: data.scrapedAt,
    totalValuation: Object.values(byCategory).reduce((s, c) => s + c.totalValuation, 0),
    totalUnrealizedGain: Object.values(byCategory).reduce((s, c) => s + c.totalUnrealizedGain, 0),
    categories: byCategory
  });
});

app.get('/api/historical', (req, res) => {
  const snapshots = getHistoricalSnapshots();
  const result = snapshots.map(s => ({
    id: s.id,
    totalAssets: s.total_assets,
    scrapedAt: s.scraped_at
  }));
  res.json(result);
});

const PORT = process.env.PORT || 3001;
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = { app };
