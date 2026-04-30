import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ListingCard } from "@/components/cards/ListingCard";
import { CategoryCard } from "@/components/cards/CategoryCard";
import { LISTINGS, CATEGORIES } from "@/lib/mock-data";
import type { Vertical } from "@/types";

const VERTICAL_META: Record<Vertical, { name: string; description: string }> = {
  automocion: {
    name: "Automoción",
    description: "Coches, motos, furgonetas, recambios y accesorios.",
  },
  masajes: {
    name: "Masajes y bienestar",
    description: "Masajistas, fisioterapeutas y centros de bienestar cerca de ti.",
  },
  dating: {
    name: "Dating",
    description: "Conecta de forma privada y segura.",
  },
};

interface Props {
  params: Promise<{ vertical: Vertical }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { vertical } = await params;
  const meta = VERTICAL_META[vertical];
  if (!meta) return { title: "No encontrado" };
  return { title: meta.name, description: meta.description };
}

export default async function VerticalPage({ params }: Props) {
  const { vertical } = await params;
  const meta = VERTICAL_META[vertical];
  if (!meta) notFound();

  const listings = LISTINGS.filter((l) => l.vertical === vertical);
  const cats = CATEGORIES.filter((c) => c.vertical === vertical);

  return (
    <SiteLayout>
      <div className="bg-primary text-primary-foreground py-10 mb-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-display font-black mb-1">{meta.name}</h1>
          <p className="text-primary-foreground/80">{meta.description}</p>
        </div>
      </div>

      <div className="container mx-auto px-4">
        {cats.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-display font-bold mb-4">Subcategorías</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {cats.map((cat) => (
                <CategoryCard key={cat.slug} category={cat} />
              ))}
            </div>
          </section>
        )}

        <section className="mb-12">
          <h2 className="text-lg font-display font-bold mb-5">
            {listings.length} anuncios en {meta.name}
          </h2>
          {listings.length === 0 ? (
            <p className="text-muted-foreground py-12 text-center">
              Aún no hay anuncios en esta vertical.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {listings.map((l, i) => (
                <ListingCard key={l.id} listing={l} index={i} />
              ))}
            </div>
          )}
        </section>
      </div>
    </SiteLayout>
  );
}
