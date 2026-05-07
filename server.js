const express = require('express');
const cors = require('cors');
const path = require('path');
const { getLatestSnapshot, getHistoricalSnapshots } = require('./db');

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

app.get('/api/historical', (req, res) => {
  const snapshots = getHistoricalSnapshots();
  const result = snapshots.map(s => ({
    id: s.id,
    totalAssets: s.total_assets,
    scrapedAt: s.scraped_at
  }));
  res.json(result);
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = { app };
