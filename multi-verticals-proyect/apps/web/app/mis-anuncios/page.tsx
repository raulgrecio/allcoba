import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Package, Plus, Eye, Pencil, Trash2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { LISTINGS, formatPrice, timeAgo } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const metadata = { title: "Mis anuncios" };

const MY_LISTINGS = LISTINGS.slice(0, 3);

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  active: { label: "Activo", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  reserved: { label: "Reservado", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  sold: { label: "Vendido", className: "bg-muted text-muted-foreground" },
};

export default function MisAnunciosPage() {
  return (
    <SiteLayout>
      <div className="max-w-[80rem] mx-auto px-[1rem] py-[2rem]">
        <div className="max-w-[48rem] mx-auto">
          <div className="flex items-center justify-between mb-[1.5rem]">
            <div className="flex items-center gap-[0.5rem]">
              <Package className="w-[1.5rem] h-[1.5rem] text-primary" />
              <h1 className="text-[1.5rem] font-display font-bold text-foreground">Mis anuncios</h1>
            </div>
            <Link
              href="/publicar"
              className={cn(
                buttonVariants(),
                "rounded-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm"
              )}
            >
              <Plus className="w-[1rem] h-[1rem] mr-[0.375rem]" /> Publicar
            </Link>
          </div>

          {MY_LISTINGS.length === 0 ? (
            <div className="text-center py-[5rem] text-muted-foreground border border-dashed border-border rounded-[1rem] bg-muted/20">
              <Package className="w-[3rem] h-[3rem] mx-auto mb-[1rem] opacity-20" />
              <p className="text-[1.125rem] font-bold mb-[0.5rem] text-foreground">Aún no tienes anuncios</p>
              <Link href="/publicar" className={buttonVariants({ className: "rounded-full mt-[1rem]" })}>
                Publicar mi primer anuncio
              </Link>
            </div>
          ) : (
            <div className="space-y-[0.75rem]">
              {MY_LISTINGS.map((listing) => {
                const status = STATUS_LABELS[listing.status];
                return (
                  <div
                    key={listing.id}
                    className="flex items-center gap-[1rem] bg-card border border-border rounded-[1rem] p-[1rem] hover-elevate transition-all"
                  >
                    <div className="relative w-[5rem] h-[5rem] flex-shrink-0 rounded-[0.75rem] overflow-hidden bg-muted border border-border/50">
                      {listing.images[0] && (
                        <Image
                          src={listing.images[0]}
                          alt={listing.title}
                          fill
                          className="object-cover"
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[0.875rem] line-clamp-1 text-foreground">{listing.title}</p>
                      <p className="text-primary font-bold text-[1.125rem]">{formatPrice(listing.price)}</p>
                      <div className="flex items-center gap-[0.5rem] mt-[0.25rem]">
                        <span className={cn("text-[0.75rem] px-[0.5rem] py-[0.125rem] rounded-full font-bold", status?.className)}>
                          {status?.label}
                        </span>
                        <span className="text-[0.75rem] text-muted-foreground">{timeAgo(listing.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-[0.25rem] flex-shrink-0">
                      <Link
                        href={`/${listing.vertical}/${listing.id}`}
                        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "w-[2rem] h-[2rem] rounded-full")}
                      >
                        <Eye className="w-[1rem] h-[1rem]" />
                      </Link>
                      <button className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "w-[2rem] h-[2rem] rounded-full")}>
                        <Pencil className="w-[1rem] h-[1rem]" />
                      </button>
                      <button className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "w-[2rem] h-[2rem] rounded-full text-destructive hover:text-destructive hover:bg-destructive/10")}>
                        <Trash2 className="w-[1rem] h-[1rem]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
