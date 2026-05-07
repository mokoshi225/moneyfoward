const API_BASE = 'http://localhost:3000/api';

function formatCurrency(amount) {
  if (typeof amount !== 'number') return '0円';
  return `${amount.toLocaleString('ja-JP')}円`;
}

async function fetchLatestData() {
  try {
    const res = await fetch(`${API_BASE}/latest`);
    if (!res.ok) {
      if (res.status === 404) {
        document.getElementById('totalAssets').textContent = 'データなし';
        return;
      }
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    document.getElementById('totalAssets').textContent = data.totalAssets;
    
    if (data.categories && data.categories.length > 0) {
      renderPieChart(data.categories);
      renderCategoryList(data.categories);
    }
  } catch (err) {
    console.error('最新データ取得失敗:', err);
    showError('最新データの取得に失敗しました');
  }
}

async function fetchHistoricalData() {
  try {
    const res = await fetch(`${API_BASE}/historical`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.length > 0) {
      renderLineChart(data);
    }
  } catch (err) {
    console.error('履歴データ取得失敗:', err);
  }
}

function renderPieChart(categories) {
  const ctx = document.getElementById('pieChart').getContext('2d');
  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: categories.map(c => c.name),
      datasets: [{
        data: categories.map(c => c.amount),
        backgroundColor: [
          '#215CC4', '#89dbec', '#FFBD30', '#CB2A2A',
          '#f18d00', '#f68370', '#16A630', '#feabb9',
          '#00909e', '#d4d4d4', '#009e68', '#78197c',
          '#ed3a40'
        ].slice(0, categories.length)
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

function renderCategoryList(categories) {
  const list = document.getElementById('categoryList');
  list.innerHTML = categories.map(cat => `
    <div class="category-item">
      <span class="category-name">${cat.name}</span>
      <span class="category-amount">${formatCurrency(cat.amount)}</span>
    </div>
  `).join('');
}

function renderLineChart(historical) {
  const ctx = document.getElementById('lineChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: historical.map(s => new Date(s.scrapedAt).toLocaleDateString('ja-JP')),
      datasets: [{
        label: '総資産',
        data: historical.map(s => {
          const num = parseInt(s.totalAssets.replace(/,/g, '').replace('円', ''));
          return isNaN(num) ? 0 : num;
        }),
        borderColor: '#215CC4',
        backgroundColor: 'rgba(33, 92, 196, 0.1)',
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          ticks: {
            callback: value => formatCurrency(value)
          }
        }
      }
    }
  });
}

function showError(message) {
  const main = document.querySelector('main');
  main.innerHTML = `<div class="error-message">${message}</div>`;
}

document.addEventListener('DOMContentLoaded', () => {
  fetchLatestData();
  fetchHistoricalData();
});
