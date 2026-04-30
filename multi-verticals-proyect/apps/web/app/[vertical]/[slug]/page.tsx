import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Star, Shield, ChevronLeft, Truck } from "lucide-react";
import type { Metadata } from "next";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ListingCard } from "@/components/cards/ListingCard";
import { LISTINGS, formatPrice, CONDITION_LABELS } from "@/lib/mock-data";
import type { Vertical } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  params: Promise<{ vertical: Vertical; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const listing = LISTINGS.find((l) => l.id === slug);
  if (!listing) return { title: "No encontrado" };
  return {
    title: listing.title,
    description: listing.description ?? listing.title,
    openGraph: {
      images: listing.images[0] ? [listing.images[0]] : [],
    },
  };
}

export default async function ListingDetailPage({ params }: Props) {
  const { slug, vertical } = await params;
  const listing = LISTINGS.find((l) => l.id === slug && l.vertical === vertical);
  if (!listing) notFound();

  const related = LISTINGS.filter(
    (l) => l.id !== listing.id && l.vertical === listing.vertical
  ).slice(0, 4);

  const { seller } = listing;

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <Link
          href={`/${vertical}`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-4 -ml-2 text-muted-foreground")}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Volver
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: gallery + description */}
          <div className="lg:col-span-2 space-y-6">
            {/* Gallery */}
            <div className="space-y-2">
              <div className="relative aspect-square md:aspect-[4/3] rounded-2xl overflow-hidden bg-muted">
                {listing.images[0] && (
                  <Image
                    src={listing.images[0]}
                    alt={listing.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    priority
                  />
                )}
                {listing.status === "sold" && (
                  <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                    <span className="bg-foreground text-background px-6 py-2 font-bold uppercase tracking-widest rounded rotate-[-8deg] shadow-xl text-lg">
                      Vendido
                    </span>
                  </div>
                )}
              </div>

              {listing.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {listing.images.map((src, i) => (
                    <div key={i} className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-muted">
                      <Image src={src} alt={`${listing.title} foto ${i + 1}`} fill className="object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Title + price (mobile) */}
            <div className="lg:hidden">
              <p className="text-3xl font-display font-black text-primary mb-1">
                {formatPrice(listing.price)}
              </p>
              <h1 className="text-xl font-semibold">{listing.title}</h1>
            </div>

            {/* Detail badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{CONDITION_LABELS[listing.condition]}</Badge>
              {listing.shippingAvailable && (
                <Badge className="gap-1 bg-primary/10 text-primary border-0">
                  <Truck className="w-3 h-3" /> Envío disponible
                </Badge>
              )}
              <Badge variant="outline" className="gap-1">
                <MapPin className="w-3 h-3" /> {listing.city}
              </Badge>
            </div>

            {listing.description && (
              <div>
                <h2 className="font-semibold mb-2">Descripción</h2>
                <p className="text-muted-foreground leading-relaxed text-sm whitespace-pre-line">
                  {listing.description}
                </p>
              </div>
            )}

            <Separator />

            {/* Seller — mobile */}
            <div className="lg:hidden bg-card border border-border rounded-2xl p-4">
              <SellerInfo seller={seller} />
            </div>
          </div>

          {/* Right: price + CTAs + seller */}
          <div className="space-y-4">
            <div className="hidden lg:block bg-card border border-border rounded-2xl p-5 sticky top-24">
              <p className="text-4xl font-display font-black text-primary mb-1">
                {formatPrice(listing.price)}
              </p>
              <h1 className="text-lg font-semibold mb-4 leading-snug">{listing.title}</h1>

              <div className="space-y-3">
                <Button
                  className="w-full rounded-full h-11 font-semibold"
                  disabled={listing.status === "sold"}
                >
                  {listing.status === "sold" ? "Vendido" : "Enviar mensaje"}
                </Button>
                <Button variant="outline" className="w-full rounded-full h-11 font-semibold">
                  Guardar
                </Button>
              </div>

              <Separator className="my-4" />
              <SellerInfo seller={seller} />
            </div>

            {/* Mobile CTAs */}
            <div className="lg:hidden fixed bottom-16 md:bottom-0 inset-x-0 z-40 bg-card border-t border-border p-4 flex gap-3">
              <Button variant="outline" className="flex-1 rounded-full h-11 font-semibold">
                Guardar
              </Button>
              <Button className="flex-1 rounded-full h-11 font-semibold" disabled={listing.status === "sold"}>
                {listing.status === "sold" ? "Vendido" : "Contactar"}
              </Button>
            </div>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-display font-bold mb-5">Anuncios similares</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {related.map((l, i) => (
                <ListingCard key={l.id} listing={l} index={i} />
              ))}
            </div>
          </section>
        )}
      </div>
    </SiteLayout>
  );
}

function SellerInfo({ seller }: { seller: (typeof LISTINGS)[0]["seller"] }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Vendedor</p>
      <div className="flex items-center gap-3 mb-3">
        <Avatar className="w-12 h-12">
          <AvatarImage src={seller.avatarUrl} alt={seller.alias} />
          <AvatarFallback className="bg-primary/10 text-primary font-bold">
            {seller.alias[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-sm">{seller.alias}</p>
            {seller.verified && <Shield className="w-4 h-4 text-primary fill-primary/20" />}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="font-medium text-foreground">{seller.rating}</span>
            <span>({seller.reviewCount} valoraciones)</span>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Miembro desde {new Date(seller.memberSince).getFullYear()} · {seller.city}
      </p>
    </div>
  );
}
