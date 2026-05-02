"use client";

import { Heart, MapPin, Truck } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";
import { formatPrice, timeAgo } from "../../lib/format";
import type { Listing } from "../../types";

interface BaseLinkProps {
  href: string;
  className?: string;
  children: React.ReactNode;
}

const DefaultLink = ({ href, className, children }: BaseLinkProps) => (
  <a href={href} className={className}>{children}</a>
);

interface ListingCardProps {
  listing: Listing;
  index?: number;
  variant?: "grid" | "carousel";
  LinkComponent?: React.ComponentType<BaseLinkProps>;
}

export function ListingCard({ listing, index = 0, variant = "grid", LinkComponent = DefaultLink }: ListingCardProps) {
  const isCarousel = variant === "carousel";

  return (
    <motion.article
      initial={{ opacity: 0, y: isCarousel ? 0 : "1rem" }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      className="group"
    >
      <LinkComponent href={`/${listing.vertical}/${listing.id}`} className={cn("block", !isCarousel && "h-full")}>
        <div
          className={cn(
            "flex flex-col overflow-hidden transition-all duration-300",
            isCarousel
              ? "rounded-xl bg-card"
              : "rounded-[0.75rem] bg-card border border-border hover-elevate h-full"
          )}
        >
          {/* Image */}
          <div className="relative h-48 sm:h-[17rem] overflow-hidden bg-muted rounded-xl">
            {listing.images[0] ? (
              <img
                src={listing.images[0]}
                alt={listing.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 text-[3rem]">
                📦
              </div>
            )}

            {listing.status === "sold" && (
              <div className="absolute inset-0 bg-background/70 backdrop-blur-[0.25rem] flex items-center justify-center z-10">
                <span className="bg-foreground text-background px-3 py-1 text-xs font-bold uppercase tracking-widest rounded rotate-[-12deg] shadow-lg">
                  Vendido
                </span>
              </div>
            )}
            {listing.status === "reserved" && (
              <div className="absolute top-2 left-2 z-10">
                <span className="bg-accent text-accent-foreground text-[0.625rem] font-semibold px-2 py-0.5 rounded-full shadow-sm">
                  Reservado
                </span>
              </div>
            )}

            <button
              aria-label={listing.isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"}
              onClick={(e) => {
                e.preventDefault();
              }}
              className={cn(
                "absolute top-2 right-2 z-20 p-1.5 rounded-full backdrop-blur-[0.5rem] transition-all active:scale-90",
                listing.isFavorite
                  ? "bg-white/90 text-red-500 shadow-sm"
                  : "bg-black/20 text-white hover:bg-black/40"
              )}
            >
              <Heart
                className={cn(
                  "transition-transform",
                  isCarousel ? "w-3.5 h-3.5" : "w-4 h-4",
                  listing.isFavorite && "fill-current"
                )}
              />
            </button>
          </div>

          {/* Info */}
          <div className={cn("flex flex-col gap-0.5", isCarousel ? "pt-2" : "p-3 flex-1")}>
            <p className={cn("font-bold text-primary leading-tight", isCarousel ? "text-sm" : "text-base")}>
              {formatPrice(listing.price)}
            </p>
            <p
              className={cn(
                "leading-snug text-foreground",
                isCarousel ? "text-xs line-clamp-1" : "text-sm font-medium line-clamp-2"
              )}
            >
              {listing.title}
            </p>
            {isCarousel ? (
              <div className="flex items-center gap-1 text-[0.6875rem] text-muted-foreground mt-0.5">
                {listing.shippingAvailable ? (
                  <span className="text-primary font-medium flex items-center gap-0.5">
                    <Truck className="w-3 h-3" /> Envío disponible
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    {listing.city}
                  </span>
                )}
              </div>
            ) : (
              <div className="mt-auto pt-2 flex items-center justify-between text-[0.6875rem] text-muted-foreground border-t border-border/50">
                <span className="flex items-center gap-0.5 truncate max-w-[60%]">
                  {listing.shippingAvailable ? (
                    <span className="text-primary font-medium flex items-center gap-0.5">
                      <Truck className="w-3 h-3" /> Envío
                    </span>
                  ) : (
                    <>
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{listing.city}</span>
                    </>
                  )}
                </span>
                <span className="flex-shrink-0">{timeAgo(listing.createdAt)}</span>
              </div>
            )}
          </div>
        </div>
      </LinkComponent>
    </motion.article>
  );
}
