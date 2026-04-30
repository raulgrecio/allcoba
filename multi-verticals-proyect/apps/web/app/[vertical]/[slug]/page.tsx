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
import { ListingCard } from "@/components/molecules/ListingCard";
import { LISTINGS, formatPrice, CONDITION_LABELS } from "@/lib/mock-data";
import type { Vertical, Seller } from "@/types";
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
      <div className="max-w-[80rem] mx-auto px-[1rem] py-[1.5rem]">
        <Link
          href={`/${vertical}`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-[1rem] -ml-[0.5rem] text-muted-foreground")}
        >
          <ChevronLeft className="w-[1rem] h-[1rem] mr-[0.25rem]" />
          Volver
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-[2rem]">
          {/* Left: gallery + description */}
          <div className="lg:col-span-2 space-y-[1.5rem]">
            {/* Gallery */}
            <div className="space-y-[0.5rem]">
              <div className="relative aspect-square md:aspect-[4/3] rounded-[1rem] overflow-hidden bg-muted border border-border">
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
                    <span className="bg-foreground text-background px-[1.5rem] py-[0.5rem] font-bold uppercase tracking-widest rounded rotate-[-8deg] shadow-xl text-[1.125rem]">
                      Vendido
                    </span>
                  </div>
                )}
              </div>

              {listing.images.length > 1 && (
                <div className="flex gap-[0.5rem] overflow-x-auto pb-[0.25rem]">
                  {listing.images.map((src, i) => (
                    <div key={i} className="relative w-[5rem] h-[5rem] flex-shrink-0 rounded-[0.75rem] overflow-hidden bg-muted border border-border">
                      <Image src={src} alt={`${listing.title} foto ${i + 1}`} fill className="object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Title + price (mobile) */}
            <div className="lg:hidden">
              <p className="text-[1.875rem] font-display font-black text-primary mb-[0.25rem]">
                {formatPrice(listing.price)}
              </p>
              <h1 className="text-[1.25rem] font-bold text-foreground">{listing.title}</h1>
            </div>

            {/* Detail badges */}
            <div className="flex flex-wrap gap-[0.5rem]">
              <Badge variant="secondary" className="rounded-full px-[0.75rem]">{CONDITION_LABELS[listing.condition]}</Badge>
              {listing.shippingAvailable && (
                <Badge className="gap-[0.25rem] bg-primary/10 text-primary border-0 rounded-full px-[0.75rem]">
                  <Truck className="w-[0.75rem] h-[0.75rem]" /> Envío disponible
                </Badge>
              )}
              <Badge variant="outline" className="gap-[0.25rem] rounded-full px-[0.75rem]">
                <MapPin className="w-[0.75rem] h-[0.75rem]" /> {listing.city}
              </Badge>
            </div>

            {listing.description && (
              <div>
                <h2 className="font-bold mb-[0.5rem] text-foreground">Descripción</h2>
                <p className="text-muted-foreground leading-relaxed text-[0.875rem] whitespace-pre-line">
                  {listing.description}
                </p>
              </div>
            )}

            <Separator className="bg-border" />

            {/* Seller — mobile */}
            <div className="lg:hidden bg-card border border-border rounded-[1rem] p-[1rem]">
              <SellerInfo seller={seller} />
            </div>
          </div>

          {/* Right: price + CTAs + seller */}
          <div className="space-y-[1rem]">
            <div className="hidden lg:block bg-card border border-border rounded-[1rem] p-[1.25rem] sticky top-[6rem]">
              <p className="text-[2.25rem] font-display font-black text-primary mb-[0.25rem]">
                {formatPrice(listing.price)}
              </p>
              <h1 className="text-[1.125rem] font-bold text-foreground mb-[1rem] leading-snug">{listing.title}</h1>

              <div className="space-y-[0.75rem]">
                <Button
                  className="w-full rounded-full h-[2.75rem] font-bold text-[1rem]"
                  disabled={listing.status === "sold"}
                >
                  {listing.status === "sold" ? "Vendido" : "Enviar mensaje"}
                </Button>
                <Button variant="outline" className="w-full rounded-full h-[2.75rem] font-bold text-[1rem]">
                  Guardar
                </Button>
              </div>

              <Separator className="my-[1rem] bg-border" />
              <SellerInfo seller={seller} />
            </div>

            {/* Mobile CTAs */}
            <div className="lg:hidden fixed bottom-[4.5rem] md:bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-md border-t border-border p-[1rem] flex gap-[0.75rem] shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
              <Button variant="outline" className="flex-1 rounded-full h-[2.75rem] font-bold">
                Guardar
              </Button>
              <Button className="flex-1 rounded-full h-[2.75rem] font-bold" disabled={listing.status === "sold"}>
                {listing.status === "sold" ? "Vendido" : "Contactar"}
              </Button>
            </div>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-[3rem]">
            <h2 className="text-[1.25rem] font-display font-bold mb-[1.25rem] text-foreground">Anuncios similares</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[1rem]">
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

function SellerInfo({ seller }: { seller: Seller }) {
  return (
    <div>
      <p className="text-[0.75rem] font-bold text-muted-foreground uppercase tracking-wider mb-[0.75rem]">Vendedor</p>
      <div className="flex items-center gap-[0.75rem] mb-[0.75rem]">
        <Avatar className="w-[3rem] h-[3rem]">
          <AvatarImage src={seller.avatarUrl} alt={seller.alias} />
          <AvatarFallback className="bg-primary/10 text-primary font-bold">
            {seller.alias[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-[0.375rem]">
            <p className="font-bold text-[0.875rem] text-foreground">{seller.alias}</p>
            {seller.verified && <Shield className="w-[1rem] h-[1rem] text-primary fill-primary/20" />}
          </div>
          <div className="flex items-center gap-[0.25rem] text-[0.75rem] text-muted-foreground">
            <Star className="w-[0.75rem] h-[0.75rem] fill-amber-400 text-amber-400" />
            <span className="font-bold text-foreground">{seller.rating}</span>
            <span>({seller.reviewCount} valoraciones)</span>
          </div>
        </div>
      </div>
      <p className="text-[0.75rem] text-muted-foreground">
        Miembro desde {new Date(seller.memberSince).getFullYear()} · {seller.city}
      </p>
    </div>
  );
}
