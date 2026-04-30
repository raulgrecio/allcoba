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
  active: { label: "Activo", className: "bg-green-100 text-green-700" },
  reserved: { label: "Reservado", className: "bg-amber-100 text-amber-700" },
  sold: { label: "Vendido", className: "bg-muted text-muted-foreground" },
};

export default function MisAnunciosPage() {
  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-display font-bold">Mis anuncios</h1>
          </div>
          <Link
            href="/publicar"
            className={cn(
              buttonVariants(),
              "rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
            )}
          >
            <Plus className="w-4 h-4 mr-1.5" /> Publicar
          </Link>
        </div>

        {MY_LISTINGS.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-semibold mb-2">Aún no tienes anuncios</p>
            <Link href="/publicar" className={buttonVariants({ className: "rounded-full mt-4" })}>
              Publicar mi primer anuncio
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {MY_LISTINGS.map((listing) => {
              const status = STATUS_LABELS[listing.status];
              return (
                <div
                  key={listing.id}
                  className="flex items-center gap-4 bg-card border border-border rounded-2xl p-4"
                >
                  <div className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-muted">
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
                    <p className="font-semibold text-sm line-clamp-1">{listing.title}</p>
                    <p className="text-primary font-bold">{formatPrice(listing.price)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.className}`}>
                        {status.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{timeAgo(listing.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Link
                      href={`/${listing.vertical}/${listing.id}`}
                      className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "w-8 h-8")}
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    <button className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "w-8 h-8")}>
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "w-8 h-8 text-destructive hover:text-destructive")}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
