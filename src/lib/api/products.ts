import { SERVICE_URLS } from "@/src/config/constants";
import { getOrCreateDeviceId } from "@/src/lib/device-id";
import { apiFetch } from "@/src/lib/api/client";
import { ApiError } from "@/src/lib/api/errors";
import type { CatalogProductType, ProductListResponse, ProductRow } from "@/src/lib/api/types";

export async function fetchCatalogProductTypes(
  token: string,
): Promise<CatalogProductType[]> {
  return apiFetch("/products/meta/product-types", {
    method: "GET",
    token,
  });
}

export async function listMyProducts(
  token: string,
  page: number,
  pageSize: number,
  opts?: { sellerUserId?: string },
): Promise<ProductListResponse> {
  const q = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (opts?.sellerUserId) {
    q.set("sellerUserId", opts.sellerUserId);
  }
  return apiFetch(`/products?${q.toString()}`, { method: "GET", token });
}

export async function fetchProduct(token: string, id: string): Promise<ProductRow> {
  return apiFetch(`/products/${id}`, { method: "GET", token });
}

export async function updateProductDetails(
  token: string,
  id: string,
  body: {
    name?: string;
    description?: string;
    price?: number;
    attributes?: Record<string, unknown>;
  },
): Promise<ProductRow> {
  return apiFetch(`/products/${id}/details`, {
    method: "PATCH",
    token,
    body: JSON.stringify(body),
  });
}

export async function deleteProduct(token: string, id: string): Promise<void> {
  await apiFetch(`/products/${id}`, { method: "DELETE", token });
}

export async function removeProductGalleryKeys(
  token: string,
  id: string,
  keys: string[],
): Promise<ProductRow> {
  return apiFetch(`/products/${id}/images`, {
    method: "DELETE",
    token,
    body: JSON.stringify({ keys }),
  });
}

function parseProductRowResponse(res: Response, text: string): ProductRow {
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { message: text };
  }
  if (!res.ok) {
    throw new ApiError(
      res.status,
      parsed,
      typeof parsed === "object" &&
        parsed &&
        "message" in parsed &&
        typeof (parsed as { message: unknown }).message === "string"
        ? (parsed as { message: string }).message
        : undefined,
    );
  }
  return parsed as ProductRow;
}

export async function replaceProductBanner(
  token: string,
  id: string,
  file: File,
): Promise<ProductRow> {
  const base = SERVICE_URLS.products;
  const deviceId = getOrCreateDeviceId();
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${base}/products/${id}/images/banner`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(deviceId ? { "X-Device-Id": deviceId } : {}),
    },
    body: fd,
  });
  const text = await res.text();
  return parseProductRowResponse(res, text);
}

export async function appendProductGallery(
  token: string,
  id: string,
  files: File[],
): Promise<ProductRow> {
  const base = SERVICE_URLS.products;
  const deviceId = getOrCreateDeviceId();
  const fd = new FormData();
  for (const f of files) {
    fd.append("gallery", f);
  }
  const res = await fetch(`${base}/products/${id}/images/gallery`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(deviceId ? { "X-Device-Id": deviceId } : {}),
    },
    body: fd,
  });
  const text = await res.text();
  return parseProductRowResponse(res, text);
}

export async function createProduct(
  token: string,
  body: {
    productTypeId: string;
    name: string;
    description: string;
    price: number;
    /** Exactly one banner image key or URL. */
    productImageUrls: string[];
    /** At least one gallery image. */
    otherImageUrls: string[];
    attributes: Record<string, unknown>;
  },
): Promise<ProductRow> {
  return apiFetch("/products", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

/** Uploads to R2 only when the listing is saved (cancel leaves no orphan objects). */
export async function publishProduct(token: string, productId: string): Promise<ProductRow> {
  return apiFetch(`/products/${encodeURIComponent(productId)}/publish`, {
    method: "POST",
    token,
  });
}

export async function createProductComplete(
  token: string,
  opts: {
    productTypeId: string;
    name: string;
    description: string;
    price: number;
    attributes: Record<string, unknown>;
    banner: File;
    gallery: File[];
    visibility?: "DRAFT" | "PUBLISHED";
  },
): Promise<ProductRow> {
  const base = SERVICE_URLS.products;
  const deviceId = getOrCreateDeviceId();
  const fd = new FormData();
  fd.append(
    "metadata",
    JSON.stringify({
      productTypeId: opts.productTypeId,
      name: opts.name,
      description: opts.description,
      price: opts.price,
      attributes: opts.attributes,
      ...(opts.visibility ? { visibility: opts.visibility } : {}),
    }),
  );
  fd.append("banner", opts.banner);
  for (const f of opts.gallery) {
    fd.append("gallery", f);
  }
  const res = await fetch(`${base}/products/complete`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(deviceId ? { "X-Device-Id": deviceId } : {}),
    },
    body: fd,
  });
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { message: text };
  }
  if (!res.ok) {
    throw new ApiError(
      res.status,
      parsed,
      typeof parsed === "object" &&
        parsed &&
        "message" in parsed &&
        typeof (parsed as { message: unknown }).message === "string"
        ? (parsed as { message: string }).message
        : undefined,
    );
  }
  return parsed as ProductRow;
}

/** Server-side upload to R2 via product-service; returns storage key (product_images/…). */
export async function uploadProductImage(token: string, file: File): Promise<string> {
  const base = SERVICE_URLS.products;
  const deviceId = getOrCreateDeviceId();
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${base}/products/uploads`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(deviceId ? { "X-Device-Id": deviceId } : {}),
    },
    body: fd,
  });
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { message: text };
  }
  if (!res.ok) {
    throw new ApiError(
      res.status,
      parsed,
      typeof parsed === "object" &&
        parsed &&
        "message" in parsed &&
        typeof (parsed as { message: unknown }).message === "string"
        ? (parsed as { message: string }).message
        : undefined,
    );
  }
  const key = (parsed as { key?: string }).key;
  if (!key) {
    throw new Error("Upload response missing key");
  }
  return key;
}
