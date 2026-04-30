"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, SlidersHorizontal, X, Grid2X2, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ListingGrid } from "@/components/patterns/ListingGrid";
import { LISTINGS, CATEGORIES, CONDITION_LABELS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { Condition, Vertical } from "@/types";

const VERTICALS: { value: Vertical | "all"; label: string }[] = [
  { value: "all", label: "Todo" },
  { value: "automocion", label: "Automoción" },
  { value: "masajes", label: "Masajes" },
];

const CONDITIONS = Object.entries(CONDITION_LABELS) as [Condition, string][];

function BuscarContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [localQ, setLocalQ] = useState(searchParams.get("q") ?? "");
  const [vertical, setVertical] = useState<Vertical | "all">(
    (searchParams.get("vertical") as Vertical) ?? "all"
  );
  const [condition, setCondition] = useState<Condition | "all">(
    (searchParams.get("condition") as Condition) ?? "all"
  );
  const [sort, setSort] = useState(searchParams.get("sort") ?? "recent");
  const [view, setView] = useState<"grid" | "list">("grid");

  const q = searchParams.get("q") ?? "";

  const filtered = useMemo(() => {
    let result = LISTINGS;
    if (q) result = result.filter((l) => l.title.toLowerCase().includes(q.toLowerCase()));
    if (vertical !== "all") result = result.filter((l) => l.vertical === vertical);
    if (condition !== "all") result = result.filter((l) => l.condition === condition);
    if (sort === "price_asc") result = [...result].sort((a, b) => a.price - b.price);
    if (sort === "price_desc") result = [...result].sort((a, b) => b.price - a.price);
    return result;
  }, [q, vertical, condition, sort]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (localQ.trim()) params.set("q", localQ.trim());
    else params.delete("q");
    router.push(`/buscar?${params.toString()}`);
  };

  const activeFilters = [
    vertical !== "all" && VERTICALS.find((v) => v.value === vertical)?.label,
    condition !== "all" && CONDITION_LABELS[condition],
  ].filter(Boolean) as string[];

  function FiltersPanel() {
    return (
      <div className="space-y-[1.5rem]">
        <div className="space-y-[0.25rem]">
          <p className="text-[0.875rem] font-bold mb-[0.5rem] text-foreground">Vertical</p>
          {VERTICALS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setVertical(value)}
              className={cn(
                "w-full text-left px-[0.75rem] py-[0.5rem] rounded-[0.5rem] text-[0.875rem] transition-colors",
                vertical === value
                  ? "bg-primary text-primary-foreground font-medium"
                  : "hover:bg-muted text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <Separator />
        <div className="space-y-[0.25rem]">
          <p className="text-[0.875rem] font-bold mb-[0.5rem] text-foreground">Estado</p>
          {[
            { value: "all" as const, label: "Cualquier estado" },
            ...CONDITIONS.map(([v, l]) => ({ value: v as Condition | "all", label: l })),
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setCondition(value)}
              className={cn(
                "w-full text-left px-[0.75rem] py-[0.5rem] rounded-[0.5rem] text-[0.875rem] transition-colors",
                condition === value
                  ? "bg-primary text-primary-foreground font-medium"
                  : "hover:bg-muted text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <SiteLayout>
      <div className="max-w-[80rem] mx-auto px-[1rem] py-[1.5rem]">
        {/* Search bar */}
        <form onSubmit={handleSearch} className="mb-[1rem]">
          <div className="relative flex items-center max-w-[32rem]">
            <Search className="absolute left-[0.75rem] w-[1rem] h-[1rem] text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Busca en Allcoba..."
              value={localQ}
              onChange={(e) => setLocalQ(e.target.value)}
              className="pl-[2.25rem] pr-[6rem] rounded-full h-[2.75rem] text-[0.875rem]"
            />
            <Button
              type="submit"
              size="sm"
              className="absolute right-[0.375rem] rounded-full h-[2rem]"
            >
              Buscar
            </Button>
          </div>
        </form>

        {/* Active filters */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-[0.5rem] mb-[1rem]">
            {activeFilters.map((f) => (
              <Badge key={f} variant="secondary" className="gap-[0.25rem] px-[0.625rem] py-[0.125rem]">
                {f}
                <X
                  className="w-[0.75rem] h-[0.75rem] cursor-pointer"
                  onClick={() => {
                    setVertical("all");
                    setCondition("all");
                  }}
                />
              </Badge>
            ))}
          </div>
        )}

        <div className="flex gap-[1.5rem]">
          {/* Sidebar — desktop */}
          <aside className="hidden md:block w-[14rem] flex-shrink-0">
            <div className="sticky top-[6rem] bg-card border border-border rounded-[1rem] p-[1rem]">
              <p className="font-bold mb-[1rem] text-foreground">Filtros</p>
              <FiltersPanel />
            </div>
          </aside>

          {/* Results */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-[1rem] gap-[0.75rem]">
              <p className="text-[0.875rem] text-muted-foreground">
                <span className="font-bold text-foreground">{filtered.length}</span> resultados
                {q && ` para "${q}"`}
              </p>
              <div className="flex items-center gap-[0.5rem]">
                {/* Mobile filter */}
                <Sheet>
                  <SheetTrigger
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "md:hidden gap-[0.375rem] rounded-full h-[2.25rem]"
                    )}
                  >
                    <SlidersHorizontal className="w-[1rem] h-[1rem]" /> Filtros
                    {activeFilters.length > 0 && (
                      <Badge className="ml-[0.25rem] h-[1rem] w-[1rem] p-0 flex items-center justify-center text-[0.625rem] bg-primary text-primary-foreground">
                        {activeFilters.length}
                      </Badge>
                    )}
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[70vh] rounded-t-[1rem]">
                    <SheetHeader>
                      <SheetTitle>Filtros</SheetTitle>
                    </SheetHeader>
                    <div className="mt-[1rem] overflow-y-auto px-[1rem]">
                      <FiltersPanel />
                    </div>
                  </SheetContent>
                </Sheet>

                <Select value={sort} onValueChange={(v) => v && setSort(v)}>
                  <SelectTrigger className="w-[9rem] h-[2.25rem] rounded-full text-[0.75rem]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Más recientes</SelectItem>
                    <SelectItem value="price_asc">Precio: menor</SelectItem>
                    <SelectItem value="price_desc">Precio: mayor</SelectItem>
                  </SelectContent>
                </Select>

                <div className="hidden sm:flex border border-border rounded-full overflow-hidden">
                  <button
                    onClick={() => setView("grid")}
                    className={cn("p-[0.5rem] transition-colors", view === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                  >
                    <Grid2X2 className="w-[1rem] h-[1rem]" />
                  </button>
                  <button
                    onClick={() => setView("list")}
                    className={cn("p-[0.5rem] transition-colors", view === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                  >
                    <List className="w-[1rem] h-[1rem]" />
                  </button>
                </div>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-[5rem] text-muted-foreground">
                <p className="text-[1.125rem] font-bold mb-[0.5rem] text-foreground">Sin resultados</p>
                <p className="text-[0.875rem]">Prueba con otros términos o quita los filtros.</p>
              </div>
            ) : (
              <ListingGrid
                listings={filtered}
                cols={view === "list" ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}
              />
            )}
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}

export default function BuscarPage() {
  return (
    <Suspense fallback={<div className="max-w-[80rem] mx-auto px-[1rem] py-[3rem] text-center text-muted-foreground">Cargando...</div>}>
      <BuscarContent />
    </Suspense>
  );
}
