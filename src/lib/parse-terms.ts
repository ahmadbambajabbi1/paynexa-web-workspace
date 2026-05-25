/** Best-effort title from transaction `terms` (often JSON from the web app). */
export function termsPreview(terms: string): string {
  try {
    const o = JSON.parse(terms) as { title?: string; productTitle?: string };
    if (typeof o.title === "string" && o.title.trim()) return o.title.trim();
    if (typeof o.productTitle === "string" && o.productTitle.trim()) {
      return o.productTitle.trim();
    }
  } catch {
    /* ignore */
  }
  const t = terms.trim();
  if (t.length > 80) return `${t.slice(0, 80)}…`;
  return t || "Transaction";
}

/** Parsed deal summary fields stored in `terms` JSON. */
export function parseTermsDeal(terms: string): {
  productTitle?: string;
  amount?: string;
  fundedBy?: string;
} | null {
  try {
    const o = JSON.parse(terms) as Record<string, unknown>;
    return {
      productTitle:
        typeof o.productTitle === "string" ? o.productTitle : undefined,
      amount: typeof o.amount === "string" ? o.amount : undefined,
      fundedBy: typeof o.fundedBy === "string" ? o.fundedBy : undefined,
    };
  } catch {
    return null;
  }
}
