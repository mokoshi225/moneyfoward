const { formatCurrency } = require('../utils');

test('formatCurrency formats 24415050 to 24,415,050円', () => {
  expect(formatCurrency(24415050)).toBe('24,415,050円');
});

test('formatCurrency formats 0 to 0円', () => {
  expect(formatCurrency(0)).toBe('0円');
});

test('formatCurrency formats large number 118974726 to 118,974,726円', () => {
  expect(formatCurrency(118974726)).toBe('118,974,726円');
});
