const LAKH = 100000;
const CRORE = 10000000;

/** Indian digit grouping, e.g. 7500000 -> "75,00,000". */
export function formatIndianNumber(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? '-' : '';
  const digits = Math.abs(rounded).toString();
  if (digits.length <= 3) {
    return sign + digits;
  }
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${sign}${rest},${last3}`;
}

export function formatRupees(value: number): string {
  return `₹ ${formatIndianNumber(value)}`;
}

/** Compact price label: 12500000 -> "₹1.25 Cr", 7500000 -> "₹75 L". */
export function formatCompactPrice(value: number): string {
  if (value >= CRORE) {
    return `₹${trim(value / CRORE)} Cr`;
  }
  if (value >= LAKH) {
    return `₹${trim(value / LAKH)} L`;
  }
  return formatRupees(value);
}

function trim(n: number): string {
  return Number(n.toFixed(2)).toString();
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('');
}
