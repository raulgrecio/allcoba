import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ListingGrid } from "@allcoba/ui";
import { CategoryCard } from "@allcoba/ui";
import { LISTINGS, CATEGORIES } from "@/lib/mock-data";
import type { Vertical } from "@allcoba/ui";

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
      <div className="bg-primary text-primary-foreground py-[2.5rem] mb-[2rem]">
        <div className="max-w-[80rem] mx-auto px-[1rem]">
          <h1 className="text-[1.875rem] md:text-[2.25rem] font-display font-black mb-[0.25rem]">{meta.name}</h1>
          <p className="text-primary-foreground/80 text-[1rem]">{meta.description}</p>
        </div>
      </div>

      <div className="max-w-[80rem] mx-auto px-[1rem]">
        {cats.length > 0 && (
          <section className="mb-[2.5rem]">
            <h2 className="text-[1.125rem] font-display font-bold mb-[1rem] text-foreground">Subcategorías</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-[0.75rem]">
              {cats.map((cat) => (
                <CategoryCard key={cat.slug} category={cat} />
              ))}
            </div>
          </section>
        )}

        <section className="mb-[3rem]">
          <h2 className="text-[1.125rem] font-display font-bold mb-[1.25rem] text-foreground">
            {listings.length} anuncios en {meta.name}
          </h2>
          {listings.length === 0 ? (
            <p className="text-muted-foreground py-[3rem] text-center text-[0.875rem]">
              Aún no hay anuncios en esta vertical.
            </p>
          ) : (
            <ListingGrid listings={listings} />
          )}
        </section>
      </div>
    </SiteLayout>
  );
}
