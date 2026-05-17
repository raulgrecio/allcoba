import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Star, Shield, ChevronLeft, Truck } from "lucide-react";
import {
  Button,
  buttonVariants,
  Badge,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Separator,
  ListingCard,
  formatPrice,
  CONDITION_LABELS,
  Link,
  cn,
} from "@allcoba/ui";
import type { Vertical, Seller } from "@allcoba/ui";
import { SiteLayout } from "#/components/layout/SiteLayout";
import { LISTINGS } from "#/lib/mock-data";

export const Route = createFileRoute("/$vertical/$slug")({
  component: ListingDetailPage,
});

function ListingDetailPage() {
  const { vertical, slug } = Route.useParams();

  const listing = LISTINGS.find(
    (l) => l.id === slug && l.vertical === (vertical as Vertical)
  );

  if (!listing) {
    return (
      <SiteLayout>
        <div className="max-w-7xl mx-auto px-4 py-20 text-center text-muted-foreground">
          <p className="text-xl font-bold mb-2 text-foreground">Anuncio no encontrado</p>
          <p className="text-sm">El anuncio que buscas no existe o ha sido retirado.</p>
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "outline", className: "mt-4 rounded-full" }))}
          >
            Volver al inicio
          </Link>
        </div>
      </SiteLayout>
    );
  }

  const related = LISTINGS.filter(
    (l) => l.id !== listing.id && l.vertical === listing.vertical
  ).slice(0, 4);

  const { seller } = listing;

  return (
    <SiteLayout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Link
          href={`/${vertical}`}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "mb-4 -ml-2 text-muted-foreground"
          )}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Volver
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: gallery + description */}
          <div className="lg:col-span-2 space-y-6">
            {/* Gallery */}
            <div className="space-y-2">
              <div className="relative aspect-square md:aspect-[4/3] rounded-2xl overflow-hidden bg-muted border border-border">
                {listing.images[0] && (
                  <img
                    src={listing.images[0]}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                )}
                {listing.status === "sold" && (
                  <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                    <span className="bg-foreground text-background px-6 py-2 font-bold uppercase tracking-widest rounded -rotate-6 shadow-xl text-lg">
                      Vendido
                    </span>
                  </div>
                )}
              </div>

              {listing.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {listing.images.map((src, i) => (
                    <div
                      key={src}
                      className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-muted border border-border"
                    >
                      <img
                        src={src}
                        alt={`${listing.title} foto ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
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
              <h1 className="text-xl font-bold text-foreground">{listing.title}</h1>
            </div>

            {/* Detail badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="rounded-full px-3">
                {CONDITION_LABELS[listing.condition]}
              </Badge>
              {listing.shippingAvailable && (
                <Badge className="gap-1 bg-primary/10 text-primary border-0 rounded-full px-3">
                  <Truck className="w-3 h-3" /> Envío disponible
                </Badge>
              )}
              <Badge variant="outline" className="gap-1 rounded-full px-3">
                <MapPin className="w-3 h-3" /> {listing.city}
              </Badge>
            </div>

            {listing.description && (
              <div>
                <h2 className="font-bold mb-2 text-foreground">Descripción</h2>
                <p className="text-muted-foreground leading-relaxed text-sm whitespace-pre-line">
                  {listing.description}
                </p>
              </div>
            )}

            <Separator className="bg-border" />

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
              <h1 className="text-lg font-bold text-foreground mb-4 leading-snug">
                {listing.title}
              </h1>

              <div className="space-y-3">
                <Button
                  className="w-full rounded-full h-11 font-bold text-base bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm"
                  disabled={listing.status === "sold"}
                >
                  {listing.status === "sold" ? "Vendido" : "Enviar mensaje"}
                </Button>
                <Button variant="outline" className="w-full rounded-full h-11 font-bold text-base">
                  Guardar
                </Button>
              </div>

              <Separator className="my-4 bg-border" />
              <SellerInfo seller={seller} />
            </div>

            {/* Mobile CTAs */}
            <div className="lg:hidden fixed bottom-18 md:bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-md border-t border-border p-4 flex gap-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
              <Button variant="outline" className="flex-1 rounded-full h-11 font-bold">
                Guardar
              </Button>
              <Button
                className="flex-1 rounded-full h-11 font-bold bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm"
                disabled={listing.status === "sold"}
              >
                {listing.status === "sold" ? "Vendido" : "Contactar"}
              </Button>
            </div>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-display font-bold mb-5 text-foreground">
              Anuncios similares
            </h2>
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

function SellerInfo({ seller }: { seller: Seller }) {
  return (
    <div>
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
        Vendedor
      </p>
      <div className="flex items-center gap-3 mb-3">
        <Avatar className="w-12 h-12">
          <AvatarImage src={seller.avatarUrl} alt={seller.alias} />
          <AvatarFallback className="bg-primary/10 text-primary font-bold">
            {seller.alias[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-1.5">
            <p className="font-bold text-sm text-foreground">{seller.alias}</p>
            {seller.verified && <Shield className="w-4 h-4 text-primary fill-primary/20" />}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="font-bold text-foreground">{seller.rating}</span>
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
