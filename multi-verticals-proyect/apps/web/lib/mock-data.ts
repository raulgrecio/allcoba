import type { Category, Listing, Seller, MarketplaceStats } from "@allcoba/ui";

export const CATEGORIES: Category[] = [
  { slug: "coches", name: "Coches", icon: "car", vertical: "automocion", count: 4820 },
  { slug: "motos", name: "Motos", icon: "bike", vertical: "automocion", count: 1340 },
  { slug: "masaje-relajante", name: "Masaje relajante", icon: "heart-pulse", vertical: "masajes", count: 892 },
  { slug: "masaje-deportivo", name: "Masaje deportivo", icon: "dumbbell", vertical: "masajes", count: 430 },
  { slug: "recambios", name: "Recambios", icon: "wrench", vertical: "automocion", count: 2100 },
  { slug: "accesorios", name: "Accesorios", icon: "package", vertical: "automocion", count: 1675 },
];

const S0: Seller = {
  id: "u1", alias: "CarlosVende",
  avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop",
  rating: 4.8, reviewCount: 47, memberSince: "2022-03-15", verified: true, city: "Madrid",
};
const S1: Seller = {
  id: "u2", alias: "MotosBarato",
  avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop",
  rating: 4.5, reviewCount: 23, memberSince: "2023-01-08", verified: false, city: "Barcelona",
};
const S2: Seller = {
  id: "u3", alias: "SpaValencia",
  avatarUrl: "https://images.unsplash.com/photo-1494790108755-2616b19f6d5f?w=80&h=80&fit=crop",
  rating: 4.9, reviewCount: 112, memberSince: "2021-07-20", verified: true, city: "Valencia",
};
const S3: Seller = {
  id: "u4", alias: "RecambiosPro",
  rating: 4.2, reviewCount: 8, memberSince: "2024-02-01", verified: false, city: "Sevilla",
};

export const LISTINGS: Listing[] = [
  {
    id: "l1", title: "BMW Serie 3 320d 2019 - Impecable", price: 24500,
    shippingAvailable: false, condition: "como_nuevo",
    images: ["https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&h=600&fit=crop"],
    city: "Madrid", vertical: "automocion", categorySlug: "coches",
    status: "active", isFavorite: false, createdAt: "2025-04-28T10:00:00Z", seller: S0,
    description: "BMW Serie 3 320d xDrive de 2019. 85.000 km reales, full equip, techo solar, navegación. Revisiones en BMW Madrid.",
  },
  {
    id: "l2", title: "Honda CB500F 2021 - 15.000km", price: 5800,
    shippingAvailable: false, condition: "buen_estado",
    images: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=600&fit=crop"],
    city: "Barcelona", vertical: "automocion", categorySlug: "motos",
    status: "active", isFavorite: true, createdAt: "2025-04-27T14:30:00Z", seller: S1,
    description: "Honda CB500F en perfecto estado. ITV pasada. Neumáticos nuevos.",
  },
  {
    id: "l3", title: "Masaje relajante 60 min — Centro SpaValencia", price: 45,
    shippingAvailable: false, condition: "nuevo",
    images: ["https://images.unsplash.com/photo-1658118969652-d195850cf23c?w=600&h=600&fit=crop"],
    city: "Valencia", vertical: "masajes", categorySlug: "masaje-relajante",
    status: "active", isFavorite: false, createdAt: "2025-04-26T09:15:00Z", seller: S2,
    description: "Masaje relajante con aceites naturales. Camilla caliente. 60 minutos.",
  },
  {
    id: "l4", title: "Kit frenos Brembo BMW - Nuevo", price: 320,
    shippingAvailable: true, condition: "nuevo",
    images: ["https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=600&h=600&fit=crop"],
    city: "Sevilla", vertical: "automocion", categorySlug: "recambios",
    status: "active", isFavorite: false, createdAt: "2025-04-25T16:00:00Z", seller: S3,
    description: "Kit frenos Brembo original para BMW Serie 3 E90. Sin usar. Caja sellada.",
  },
  {
    id: "l5", title: "Toyota Corolla 2020 Hybrid - Full equip", price: 18900,
    shippingAvailable: false, condition: "buen_estado",
    images: ["https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=600&h=600&fit=crop"],
    city: "Madrid", vertical: "automocion", categorySlug: "coches",
    status: "active", isFavorite: false, createdAt: "2025-04-24T11:00:00Z", seller: S0,
    description: "Toyota Corolla Hybrid 2020. 62.000km. Servicio oficial. Garantía 1 año.",
  },
  {
    id: "l6", title: "Masaje deportivo / lesiones — Fisioterapia", price: 55,
    shippingAvailable: false, condition: "nuevo",
    images: ["https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=600&fit=crop"],
    city: "Barcelona", vertical: "masajes", categorySlug: "masaje-deportivo",
    status: "active", isFavorite: true, createdAt: "2025-04-23T10:00:00Z", seller: S2,
    description: "Fisioterapeuta colegiado. Masaje deportivo, lesiones musculares, puntos gatillo. 60min.",
  },
  {
    id: "l7", title: "Volkswagen Golf GTI 2018", price: 21000,
    shippingAvailable: false, condition: "buen_estado",
    images: ["https://images.unsplash.com/photo-1616455579100-2ceaa4eb2d37?w=600&h=600&fit=crop"],
    city: "Bilbao", vertical: "automocion", categorySlug: "coches",
    status: "reserved", isFavorite: false, createdAt: "2025-04-22T09:00:00Z", seller: S1,
  },
  {
    id: "l8", title: "Yamaha MT-07 2022 - 8.000km", price: 7200,
    shippingAvailable: false, condition: "como_nuevo",
    images: ["https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=600&h=600&fit=crop"],
    city: "Zaragoza", vertical: "automocion", categorySlug: "motos",
    status: "active", isFavorite: false, createdAt: "2025-04-21T15:00:00Z", seller: S0,
  },
  {
    id: "l9", title: "Suzuki Swift 2021 - 28.000km", price: 13500,
    shippingAvailable: false, condition: "buen_estado",
    images: ["https://images.unsplash.com/photo-1590362891991-f776e747a588?w=600&h=600&fit=crop"],
    city: "Madrid", vertical: "automocion", categorySlug: "coches",
    status: "active", isFavorite: false, createdAt: "2025-04-20T10:00:00Z", seller: S0,
  },
  {
    id: "l10", title: "Masaje con piedras calientes 75min", price: 65,
    shippingAvailable: false, condition: "nuevo",
    images: ["https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&h=600&fit=crop"],
    city: "Valencia", vertical: "masajes", categorySlug: "masaje-relajante",
    status: "active", isFavorite: true, createdAt: "2025-04-19T09:00:00Z", seller: S2,
  },
  {
    id: "l11", title: "Ford Mustang GT 2017 - 450CV", price: 32000,
    shippingAvailable: false, condition: "buen_estado",
    images: ["https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=600&h=600&fit=crop"],
    city: "Barcelona", vertical: "automocion", categorySlug: "coches",
    status: "active", isFavorite: false, createdAt: "2025-04-18T14:00:00Z", seller: S1,
  },
  {
    id: "l12", title: "Casco Shoei GT-Air II - Talla M - Nuevo", price: 380,
    shippingAvailable: true, condition: "nuevo",
    images: ["https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=600&h=600&fit=crop"],
    city: "Madrid", vertical: "automocion", categorySlug: "accesorios",
    status: "active", isFavorite: false, createdAt: "2025-04-17T11:00:00Z", seller: S3,
  },
  {
    id: "l13", title: "Reflexología podal 60min - Centro Bienestar", price: 40,
    shippingAvailable: false, condition: "nuevo",
    images: ["https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=600&h=600&fit=crop"],
    city: "Madrid", vertical: "masajes", categorySlug: "masaje-relajante",
    status: "active", isFavorite: false, createdAt: "2025-04-16T10:00:00Z", seller: S2,
  },
  {
    id: "l14", title: "Vespa Primavera 125 2020 - 9.000km", price: 3200,
    shippingAvailable: false, condition: "buen_estado",
    images: ["https://images.unsplash.com/photo-1558981359-219d6364c9c8?w=600&h=600&fit=crop"],
    city: "Barcelona", vertical: "automocion", categorySlug: "motos",
    status: "active", isFavorite: true, createdAt: "2025-04-15T16:00:00Z", seller: S1,
  },
];

export const FEATURED_LISTINGS = LISTINGS.slice(0, 8);
export const RECENT_LISTINGS = [...LISTINGS].reverse().slice(0, 10);
export const NEAR_LISTINGS = LISTINGS.filter((l) =>
  ["Madrid", "Barcelona", "Valencia"].includes(l.city)
);

export const STATS: MarketplaceStats = {
  totalListings: 43821,
  totalUsers: 12450,
  totalCategories: 24,
};
