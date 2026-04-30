"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, MapPin, Truck } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatPrice, timeAgo, CONDITION_LABELS } from "@/lib/mock-data";
import type { Listing } from "@/types";

interface ListingCardProps {
  listing: Listing;
  index?: number;
}

export function ListingCard({ listing, index = 0 }: ListingCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      className="group"
    >
      <Link href={`/${listing.vertical}/${listing.id}`} className="block h-full">
        <div className="flex flex-col rounded-xl bg-card border border-border overflow-hidden hover-elevate h-full">
          {/* Image */}
          <div className="relative aspect-square overflow-hidden bg-muted">
            {listing.images[0] ? (
              <Image
                src={listing.images[0]}
                alt={listing.title}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 text-5xl">
                📦
              </div>
            )}

            {/* Status overlays */}
            {listing.status === "sold" && (
              <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center z-10">
                <span className="bg-foreground text-background px-4 py-1.5 text-sm font-bold uppercase tracking-widest rounded rotate-[-12deg] shadow-lg">
                  Vendido
                </span>
              </div>
            )}
            {listing.status === "reserved" && (
              <div className="absolute top-2 left-2 z-10">
                <Badge className="bg-accent text-accent-foreground text-xs font-semibold shadow-sm">
                  Reservado
                </Badge>
              </div>
            )}

            {/* Favorite button */}
            <button
              aria-label={listing.isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"}
              onClick={(e) => {
                e.preventDefault();
                // TODO: connect to auth + API
              }}
              className={cn(
                "absolute top-2 right-2 z-20 p-2 rounded-full backdrop-blur-md transition-all active:scale-90",
                listing.isFavorite
                  ? "bg-white/90 text-red-500 shadow-sm"
                  : "bg-black/20 text-white hover:bg-black/40"
              )}
            >
              <Heart
                className={cn("w-4 h-4 transition-transform", listing.isFavorite && "fill-current")}
              />
            </button>
          </div>

          {/* Info */}
          <div className="p-3 flex flex-col flex-1 gap-1">
            <p className="text-lg font-bold text-primary leading-none">
              {formatPrice(listing.price)}
            </p>
            <p className="text-sm font-medium leading-snug line-clamp-2 text-foreground">
              {listing.title}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{CONDITION_LABELS[listing.condition]}</span>
              {listing.shippingAvailable && (
                <>
                  <span>·</span>
                  <span className="text-primary font-medium flex items-center gap-0.5">
                    <Truck className="w-3 h-3" /> Envío
                  </span>
                </>
              )}
            </div>
            <div className="mt-auto pt-2 flex items-center justify-between text-xs text-muted-foreground border-t border-border/50">
              <span className="flex items-center gap-0.5 truncate max-w-[60%]">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{listing.city}</span>
              </span>
              <span className="flex-shrink-0">{timeAgo(listing.createdAt)}</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
