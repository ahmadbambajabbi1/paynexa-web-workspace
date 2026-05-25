import { apiFetch } from "@/src/lib/api/client";

export type ServiceCategory = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  sortOrder: number;
};

export type ServiceProvider = {
  id: string;
  userId: string;
  displayName: string | null;
  bio: string | null;
  verificationStatus: string;
  status: "ONLINE" | "OFFLINE" | "AWAY";
  ratingAvg: number;
  ratingCount: number;
  avgResponseTimeSec: number;
  location?: {
    latitude: number;
    longitude: number;
    addressText: string | null;
    region: string | null;
  } | null;
};

/** Provider/client name, phone, email — merged from user-service for authorized viewers. */
export type MarketplaceUserContact = {
  id: string;
  displayName: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  countryCode: string | null;
};

export type ServiceListingReview = {
  id: string;
  bookingId: string;
  listingId: string;
  providerId: string;
  clientUserId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
};

export type ServiceListing = {
  id: string;
  visibility?: "DRAFT" | "PUBLISHED";
  title: string;
  description: string;
  tags: unknown;
  media: unknown;
  /** Presigned URL or raw key after expand */
  coverImage?: unknown;
  /** JSON array of presigned URLs */
  serviceImages?: unknown;
  priceType: "FIXED" | "RANGE";
  priceAmount: string | null;
  priceMin: string | null;
  priceMax: string | null;
  estimatedDeliveryMins: number | null;
  active: boolean;
  provider: ServiceProvider;
  category: ServiceCategory;
  /** Latest reviews (detail endpoint includes up to 10) */
  reviews?: ServiceListingReview[];
};

export type PlatformServiceFees = {
  providerFeeEnabled: boolean;
  providerFeePercent: string;
  customerFeeEnabled: boolean;
  customerFeePercent: string;
};

export async function fetchPlatformServiceFees() {
  return await apiFetch<PlatformServiceFees>("/service-marketplace/platform-service-fees", {
    method: "GET",
  });
}

export async function listServiceCategories() {
  return await apiFetch<{ categories: ServiceCategory[] }>(
    "/service-marketplace/categories",
    { method: "GET" },
  );
}

export async function searchServiceListings(params: {
  categoryId?: string;
  categoryCode?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  availableAt?: string;
  minRating?: number;
  minPrice?: number;
  maxPrice?: number;
  onlineOnly?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    qs.set(k, String(v));
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return await apiFetch<{
    page: number;
    pageSize: number;
    items: { listing: ServiceListing; distanceKm: number | null; rankScore: number }[];
  }>(`/service-marketplace/listings/search${suffix}`, { method: "GET" });
}

export async function getServiceListing(id: string, token?: string | null) {
  const raw = await apiFetch<{
    listing: ServiceListing;
    viewerIsOwner: boolean;
    providerContact?: MarketplaceUserContact | null;
    /** Older product-service responses */
    providerTransparency?: MarketplaceUserContact | null;
  }>(`/service-marketplace/listings/${encodeURIComponent(id)}`, {
    method: "GET",
    token: token ?? undefined,
  });
  return {
    listing: raw.listing,
    viewerIsOwner: raw.viewerIsOwner,
    providerContact: raw.providerContact ?? raw.providerTransparency ?? null,
  };
}

export async function listMyServiceListings(token: string) {
  return await apiFetch<{ listings: ServiceListing[] }>(
    `/service-marketplace/listings/me`,
    { method: "GET", token },
  );
}

export async function pingRenderingLocation(
  token: string,
  body: { latitude: number; longitude: number; locationLabel?: string },
) {
  return await apiFetch<{ ok: boolean; skipped?: boolean }>(
    `/service-marketplace/providers/me/rendering-location`,
    { method: "PATCH", token, body: JSON.stringify(body) },
  );
}

export async function publishServiceListing(listingId: string, token: string) {
  return await apiFetch<{ listing: ServiceListing }>(
    `/service-marketplace/listings/${encodeURIComponent(listingId)}/publish`,
    { method: "POST", token },
  );
}

export async function createServiceBooking(
  id: string,
  token: string,
  body: {
    scheduledAt?: string;
    agreedAmount?: number;
    notes?: string;
    serviceLatitude?: number;
    serviceLongitude?: number;
    serviceAddressText?: string;
    serviceLocationLabel?: string;
    serviceGooglePlaceId?: string;
  },
) {
  return await apiFetch<{
    booking: unknown;
    transaction?: unknown;
  }>(`/service-marketplace/listings/${encodeURIComponent(id)}/bookings`, {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function listMyServiceBookings(token: string) {
  return await apiFetch<{ bookings: unknown[] }>(`/service-marketplace/bookings/me`, {
    method: "GET",
    token,
  });
}

export async function listProviderServiceBookings(token: string) {
  return await apiFetch<{ bookings: unknown[] }>(`/service-marketplace/bookings/provider`, {
    method: "GET",
    token,
  });
}

export async function listBookingsForMyListing(listingId: string, token: string) {
  return await apiFetch<{ bookings: unknown[] }>(
    `/service-marketplace/listings/${encodeURIComponent(listingId)}/bookings`,
    { method: "GET", token },
  );
}

export async function updateServiceBookingState(
  bookingId: string,
  token: string,
  body: {
    action:
      | "MARK_FUNDED"
      | "PROVIDER_REACHED"
      | "CLIENT_CONFIRMED_REACHED"
      | "PROVIDER_FINISHED"
      | "CLIENT_CONFIRMED_COMPLETED"
      | "COMMENT"
      | "DISPUTE"
      | "CANCEL";
    notes?: string;
  },
) {
  return await apiFetch<{ booking: unknown; action: string; by: "provider" | "client" }>(
    `/service-marketplace/bookings/${encodeURIComponent(bookingId)}/state`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify(body),
    },
  );
}

export async function submitServiceBookingReview(
  bookingId: string,
  token: string,
  body: { rating: number; comment?: string },
) {
  return await apiFetch<{ review: { id: string; rating: number; comment: string | null } }>(
    `/service-marketplace/bookings/${encodeURIComponent(bookingId)}/review`,
    {
      method: "POST",
      token,
      body: JSON.stringify(body),
    },
  );
}

