const CURRENCY_SYMBOLS: Record<string, string> = {
  GMD: "D",
  XOF: "CFA",
  GHS: "GH₵",
  NGN: "₦",
  SLE: "Le",
  GNF: "FG",
  LRD: "L$",
  MRU: "UM",
  CVE: "$",
  KES: "KSh",
  UGX: "USh",
  TZS: "TSh",
  ZAR: "R",
  USD: "$",
  GBP: "£",
  CAD: "$",
  AED: "د.إ",
};

export function currencySymbol(currency?: string | null): string {
  const code = currency?.trim().toUpperCase();
  if (!code) return "";
  return CURRENCY_SYMBOLS[code] ?? code;
}

export function formatMoney(value: string | number | null | undefined, currency?: string | null): string {
  const n = Number(value ?? 0);
  const amount = Number.isFinite(n) ? n.toFixed(2) : "0.00";
  const symbol = currencySymbol(currency);
  return symbol ? `${symbol}${amount}` : amount;
}
