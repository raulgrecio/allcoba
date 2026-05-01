export type Vertical = "automocion" | "masajes" | "dating";
export type Condition = "nuevo" | "como_nuevo" | "buen_estado" | "aceptable";
export type ListingStatus = "active" | "sold" | "reserved";

export interface Category {
  slug: string;
  name: string;
  icon: string;
  vertical: Vertical;
  count: number;
}

export interface Seller {
  id: string;
  alias: string;
  avatarUrl?: string;
  rating: number;
  reviewCount: number;
  memberSince: string;
  verified: boolean;
  city: string;
}

export interface Listing {
  id: string;
  title: string;
  price: number;
  shippingAvailable: boolean;
  condition: Condition;
  images: string[];
  city: string;
  vertical: Vertical;
  categorySlug: string;
  status: ListingStatus;
  isFavorite: boolean;
  createdAt: string;
  seller: Seller;
  description?: string;
}

export interface MarketplaceStats {
  totalListings: number;
  totalUsers: number;
  totalCategories: number;
}
