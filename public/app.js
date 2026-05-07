const API_BASE = 'http://localhost:3001/api';

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
  fetchHoldingsData();
});

async function fetchHoldingsData() {
  try {
    const res = await fetch(`${API_BASE}/holdings/latest`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    document.getElementById('totalValuation').textContent = formatCurrency(data.totalValuation);
    const gainEl = document.getElementById('totalUnrealizedGain');
    gainEl.textContent = formatCurrency(data.totalUnrealizedGain);
    gainEl.style.color = data.totalUnrealizedGain >= 0 ? '#4caf50' : '#e74c3c';
    
    renderHoldingsTables(data.categories);
  } catch (err) {
    console.error('保有銘柄取得失敗:', err);
  }
}

let currentCategory = '株式(現物)';

function renderHoldingsTables(categories) {
  const tabContainer = document.querySelector('.holdings-tabs');
  if (!tabContainer) return;
  
  tabContainer.innerHTML = '';
  const tabs = Object.keys(categories);
  tabs.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn' + (cat === currentCategory ? ' active' : '');
    btn.textContent = cat === '株式(現物)' ? '株式' : cat === '投資信託' ? '投資信託' : cat === '年金' ? '年金' : cat;
    btn.dataset.cat = cat;
    btn.onclick = () => {
      currentCategory = cat;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderSingleTable(categories[cat], cat);
    };
    tabContainer.appendChild(btn);
  });
  
  if (categories[currentCategory]) {
    renderSingleTable(categories[currentCategory], currentCategory);
  } else if (tabs.length > 0) {
    renderSingleTable(categories[tabs[0]], tabs[0]);
  }
}

function renderSingleTable(catData, catName) {
  const container = document.getElementById('holdingsTableContainer');
  if (!catData || !catData.holdings || catData.holdings.length === 0) {
    container.innerHTML = '<p style="color:#999;padding:1rem">保有銘柄がありません</p>';
    return;
  }
  
  let html = '';
  html += `<div class="holdings-category-total">
    <span>${catName} 合計</span>
    <span>評価額: ${formatCurrency(catData.totalValuation)} / 評価損益: <span style="color:${catData.totalUnrealizedGain >= 0 ? '#4caf50' : '#e74c3c'}">${formatCurrency(catData.totalUnrealizedGain)}</span></span>
  </div>`;
  
  const isStock = catName === '株式(現物)';
  html += '<table class="holdings-table"><thead><tr>';
  html += isStock ? '<th>コード</th>' : '';
  html += '<th>銘柄名</th><th>評価額</th><th>評価損益</th><th>保有数</th>';
  html += '<th>金融機関</th></tr></thead><tbody>';
  
  catData.holdings.forEach(h => {
    const gainClass = h.unrealizedGain >= 0 ? 'positive' : 'negative';
    html += `<tr>
      ${isStock && h.symbol ? `<td>${h.symbol}</td>` : ''}
      <td>${h.name}</td>
      <td class="right">${formatCurrency(h.valuation)}</td>
      <td class="right ${gainClass}">${h.unrealizedGain >= 0 ? '+' : ''}${formatCurrency(h.unrealizedGain)}</td>
      <td class="right">${h.quantity ? h.quantity : '-'}</td>
      <td>${h.institution || '-'}</td>
    </tr>`;
  });
  
  html += '</tbody></table>';
  container.innerHTML = html;
}

async function fetchHoldingsData() {
  try {
    const res = await fetch(`${API_BASE}/holdings/latest`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    document.getElementById('totalValuation').textContent = formatCurrency(data.totalValuation);
    const gainEl = document.getElementById('totalUnrealizedGain');
    gainEl.textContent = formatCurrency(data.totalUnrealizedGain);
    gainEl.style.color = data.totalUnrealizedGain >= 0 ? '#4caf50' : '#e74c3c';
    
    renderHoldingsTables(data.categories);
  } catch (err) {
    console.error('保有銘柄取得失敗:', err);
  }
}

let currentCategory = '株式(現物)';

function renderHoldingsTables(categories) {
  const tabContainer = document.querySelector('.holdings-tabs');
  if (!tabContainer) return;
  
  tabContainer.innerHTML = '';
  const tabs = Object.keys(categories);
  tabs.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn' + (cat === currentCategory ? ' active' : '');
    btn.textContent = cat === '株式(現物)' ? '株式' : cat === '投資信託' ? '投資信託' : cat === '年金' ? '年金' : cat;
    btn.dataset.cat = cat;
    btn.onclick = () => {
      currentCategory = cat;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderSingleTable(categories[cat], cat);
    };
    tabContainer.appendChild(btn);
  });
  
  if (categories[currentCategory]) {
    renderSingleTable(categories[currentCategory], currentCategory);
  } else if (tabs.length > 0) {
    renderSingleTable(categories[tabs[0]], tabs[0]);
  }
}

function renderSingleTable(catData, catName) {
  const container = document.getElementById('holdingsTableContainer');
  if (!catData || !catData.holdings || catData.holdings.length === 0) {
    container.innerHTML = '<p style="color:#999;padding:1rem">保有銘柄がありません</p>';
    return;
  }
  
  let html = '';
  html += `<div class="holdings-category-total">
    <span>${catName} 合計</span>
    <span>評価額: ${formatCurrency(catData.totalValuation)} / 評価損益: <span style="color:${catData.totalUnrealizedGain >= 0 ? '#4caf50' : '#e74c3c'}">${formatCurrency(catData.totalUnrealizedGain)}</span></span>
  </div>`;
  
  const isStock = catName === '株式(現物)';
  html += '<table class="holdings-table"><thead><tr>';
  html += isStock ? '<th>コード</th>' : '';
  html += '<th>銘柄名</th><th>評価額</th><th>評価損益</th><th>保有数</th>';
  html += '<th>金融機関</th></tr></thead><tbody>';
  
  catData.holdings.forEach(h => {
    const gainClass = h.unrealizedGain >= 0 ? 'positive' : 'negative';
    html += `<tr>
      ${isStock && h.symbol ? `<td>${h.symbol}</td>` : ''}
      <td>${h.name}</td>
      <td class="right">${formatCurrency(h.valuation)}</td>
      <td class="right ${gainClass}">${h.unrealizedGain >= 0 ? '+' : ''}${formatCurrency(h.unrealizedGain)}</td>
      <td class="right">${h.quantity ? h.quantity : '-'}</td>
      <td>${h.institution || '-'}</td>
    </tr>`;
  });
  
  html += '</tbody></table>';
  container.innerHTML = html;
}
