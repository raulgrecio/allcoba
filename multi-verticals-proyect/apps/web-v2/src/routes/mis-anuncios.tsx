import { createFileRoute } from "@tanstack/react-router";
import { Package, Plus, Eye, Pencil, Trash2 } from "lucide-react";
import { buttonVariants, formatPrice, timeAgo, cn, Link } from "@allcoba/ui";
import { SiteLayout } from "#/components/layout/SiteLayout";
import { LISTINGS } from "#/lib/mock-data";

export const Route = createFileRoute("/mis-anuncios")({
  component: MisAnunciosPage,
});

const MY_LISTINGS = LISTINGS.slice(0, 3);

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  active: {
    label: "Activo",
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  reserved: {
    label: "Reservado",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  sold: { label: "Vendido", className: "bg-muted text-muted-foreground" },
};

function MisAnunciosPage() {
  return (
    <SiteLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Package className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-display font-bold text-foreground">Mis anuncios</h1>
            </div>
            <Link
              href="/publicar"
              className={cn(
                buttonVariants(),
                "rounded-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm"
              )}
            >
              <Plus className="w-4 h-4 mr-1.5" /> Publicar
            </Link>
          </div>

          {MY_LISTINGS.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground border border-dashed border-border rounded-2xl bg-muted/20">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-bold mb-2 text-foreground">Aún no tienes anuncios</p>
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
                    className="flex items-center gap-4 bg-card border border-border rounded-2xl p-4 hover-elevate transition-all"
                  >
                    <div className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-muted border border-border/50">
                      {listing.images[0] && (
                        <img
                          src={listing.images[0]}
                          alt={listing.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm line-clamp-1 text-foreground">
                        {listing.title}
                      </p>
                      <p className="text-primary font-bold text-lg">
                        {formatPrice(listing.price)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={cn(
                            "text-[0.75rem] px-2 py-0.5 rounded-full font-bold",
                            status?.className
                          )}
                        >
                          {status?.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {timeAgo(listing.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Link
                        href={`/${listing.vertical}/${listing.id}`}
                        className={cn(
                          buttonVariants({ variant: "ghost", size: "icon" }),
                          "w-8 h-8 rounded-full"
                        )}
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        type="button"
                        className={cn(
                          buttonVariants({ variant: "ghost", size: "icon" }),
                          "w-8 h-8 rounded-full"
                        )}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        className={cn(
                          buttonVariants({ variant: "ghost", size: "icon" }),
                          "w-8 h-8 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
                        )}
                      >
                        <Trash2 className="w-4 h-4" />
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
