export type MeUser = {
  id: string;
  phone: string | null;
  countryCode: string | null;
  email: string | null;
  emailVerifiedAt: string | null;
  displayName: string | null;
  fullName: string | null;
  profileCompletedAt: string | null;
  personalKycApprovedAt: string | null;
  personalKycStatus?: string | null;
  personalKycVersion?: number | null;
  personalKycRejectedReason?: string | null;
  createdAt: string;
  professionalApps: Array<{
    id: string;
    role: string;
    status: string;
    createdAt: string;
  }>;
};

export type MeResponse = {
  user: MeUser;
  deviceId: string;
  lastIp: string;
};

export type TransactionListItem = {
  id: string;
  workflow: "PUBLIC_SHAREABLE" | "ESCROW_TWO_PARTY" | string;
  shareToken?: string | null;
  sharePath?: string | null;
  type: string;
  productId?: string | null;
  productTitle: string;
  quantity?: number;
  unitPrice?: string | null;
  amount: string;
  fundedBy: string;
  buyerId: string | null;
  sellerId: string;
  status: string;
  updatedAt: string;
};

export type TransactionListResponse = {
  items: TransactionListItem[];
};

export type ProductTypeFieldDef = {
  name: string;
  label: string | null;
  valueType: string;
  required: boolean;
};

export type CatalogProductType = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  fieldDefinitions: ProductTypeFieldDef[];
  lawyerPricingEnabled: boolean;
  agentPricingEnabled: boolean;
};

export type ProductRow = {
  id: string;
  sellerUserId: string;
  productTypeId: string;
  /** DRAFT rows are seller-only until published. */
  visibility?: "DRAFT" | "PUBLISHED";
  price: string;
  /** Short listing title for dropdowns and cards (not the full description). */
  name: string;
  description: string;
  productImages: string[];
  otherImages: string[];
  /** R2 keys (for edits). */
  productImageKeys?: string[];
  otherImageKeys?: string[];
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  productType: CatalogProductType;
};

export type ProductListResponse = {
  items: ProductRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type TransactionPartyProfile = {
  id: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
};

export type ShareBuyerOrder = {
  id: string;
  buyerId: string | null;
  status: string;
  amount: string;
  productTitle: string;
  updatedAt: string;
  createdAt: string;
  buyer: TransactionPartyProfile | null;
};

export type PublicTransactionAnalytics = {
  totalViews: number;
  uniqueViewers: number;
  paidCount: number;
  totalEarnings: string;
  conversionRate: string;
  viewedNotBought: number;
  recentViewers: Array<{
    label: string;
    viewedAt: string;
    convertedAt: string | null;
  }>;
};

export type TransactionRoom = {
  transaction: {
    id: string;
    workflow: "PUBLIC_SHAREABLE" | "ESCROW_TWO_PARTY" | string;
    shareToken?: string | null;
    sharePath?: string | null;
    type: string;
    productId: string | null;
    productTitle: string;
    quantity?: number;
    unitPrice?: string | null;
    amount: string;
    fundedBy: string;
    buyerId: string | null;
    sellerId: string;
    terms: string;
    status: string;
    acceptedPartyIds: string[];
    buyerLawyerId?: string | null;
    buyerLawyerInviteStatus?: string;
    buyerAgentId?: string | null;
    buyerAgentInviteStatus?: string;
    sellerLawyerId?: string | null;
    sellerLawyerInviteStatus?: string;
    sellerAgentId?: string | null;
    sellerAgentInviteStatus?: string;
    createdAt: string;
    updatedAt: string;
  };
  /** Optional listing snapshot (photos, attributes) when the server can load it from the catalog. */
  product?: ProductRow | null;
  parties?: {
    buyer: TransactionPartyProfile | null;
    seller: TransactionPartyProfile | null;
    buyerLawyer: TransactionPartyProfile | null;
    buyerAgent: TransactionPartyProfile | null;
    sellerLawyer: TransactionPartyProfile | null;
    sellerAgent: TransactionPartyProfile | null;
  };
  publicAnalytics?: PublicTransactionAnalytics | null;
  shareBuyerOrders?: ShareBuyerOrder[] | null;
  timeline: Array<{
    at: string;
    action: string;
    actorId: string;
    detail: string;
  }>;
};

export type TransactionProfessionalSearchItem = {
  id: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  invited: boolean;
  inviteStatus: string;
};

export type ParticipantSearchResponse = {
  items: TransactionProfessionalSearchItem[];
  partySide?: string;
  productPricing?: { lawyerPricingEnabled: boolean; agentPricingEnabled: boolean };
  disabledReason?: string;
};

export type TransactionNotificationItem = {
  id: string;
  transactionId: string;
  message: string;
  role: string;
  status: string;
  createdAt: string;
  readAt: string | null;
};
