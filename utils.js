function formatCurrency(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '0円';
  }
  return `${Number(amount).toLocaleString('ja-JP')}円`;
}

module.exports = { formatCurrency };
