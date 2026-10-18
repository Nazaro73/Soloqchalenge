const intFormat = new Intl.NumberFormat('fr-FR');
const decimalFormat = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatInt = (n) => intFormat.format(Math.round(n));
export const formatDecimal = (n) => decimalFormat.format(n);
export const formatPercent = (ratio) => `${(ratio * 100).toFixed(1)} %`;

// 561498 s -> "6j 11h 58m"
export function formatPlaytime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = minutes % 60;
  if (d > 0) return `${d}j ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString('fr-FR');
}

export function plural(n, word) {
  return `${formatInt(n)} ${word}${n > 1 ? 's' : ''}`;
}
