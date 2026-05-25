import type { ProductRow } from "@/src/lib/api/types";

/** Short label for lists and selects: stored `name`, or a trimmed excerpt of the long description. */
export function productDisplayName(p: Pick<ProductRow, "name" | "description">): string {
  const n = p.name?.trim();
  if (n) return n;
  const d = p.description.trim();
  if (d.length <= 120) return d;
  return `${d.slice(0, 120)}…`;
}
