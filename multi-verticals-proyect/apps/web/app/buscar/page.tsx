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
import { ListingCard } from "@/components/cards/ListingCard";
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
      <div className="space-y-6">
        <div className="space-y-1">
          <p className="text-sm font-semibold mb-2">Vertical</p>
          {VERTICALS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setVertical(value)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
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
        <div className="space-y-1">
          <p className="text-sm font-semibold mb-2">Estado</p>
          {[
            { value: "all" as const, label: "Cualquier estado" },
            ...CONDITIONS.map(([v, l]) => ({ value: v as Condition | "all", label: l })),
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setCondition(value)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
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
      <div className="container mx-auto px-4 py-6">
        {/* Search bar */}
        <form onSubmit={handleSearch} className="mb-4">
          <div className="relative flex items-center max-w-xl">
            <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Busca en Allcoba..."
              value={localQ}
              onChange={(e) => setLocalQ(e.target.value)}
              className="pl-9 pr-24 rounded-full h-11"
            />
            <Button
              type="submit"
              size="sm"
              className="absolute right-1.5 rounded-full"
            >
              Buscar
            </Button>
          </div>
        </form>

        {/* Active filters */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {activeFilters.map((f) => (
              <Badge key={f} variant="secondary" className="gap-1">
                {f}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => {
                    setVertical("all");
                    setCondition("all");
                  }}
                />
              </Badge>
            ))}
          </div>
        )}

        <div className="flex gap-6">
          {/* Sidebar — desktop */}
          <aside className="hidden md:block w-56 flex-shrink-0">
            <div className="sticky top-24 bg-card border border-border rounded-2xl p-4">
              <p className="font-semibold mb-4">Filtros</p>
              <FiltersPanel />
            </div>
          </aside>

          {/* Results */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4 gap-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{filtered.length}</span> resultados
                {q && ` para "${q}"`}
              </p>
              <div className="flex items-center gap-2">
                {/* Mobile filter — Base UI SheetTrigger accepts className directly */}
                <Sheet>
                  <SheetTrigger
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "md:hidden gap-1.5 rounded-full"
                    )}
                  >
                    <SlidersHorizontal className="w-4 h-4" /> Filtros
                    {activeFilters.length > 0 && (
                      <Badge className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground">
                        {activeFilters.length}
                      </Badge>
                    )}
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
                    <SheetHeader>
                      <SheetTitle>Filtros</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4 overflow-y-auto px-4">
                      <FiltersPanel />
                    </div>
                  </SheetContent>
                </Sheet>

                <Select value={sort} onValueChange={(v) => v && setSort(v)}>
                  <SelectTrigger className="w-36 h-9 rounded-full text-xs">
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
                    className={cn("p-2 transition-colors", view === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                  >
                    <Grid2X2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setView("list")}
                    className={cn("p-2 transition-colors", view === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <p className="text-lg font-semibold mb-2">Sin resultados</p>
                <p className="text-sm">Prueba con otros términos o quita los filtros.</p>
              </div>
            ) : (
              <div
                className={cn(
                  "grid gap-4",
                  view === "grid"
                    ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                    : "grid-cols-1"
                )}
              >
                {filtered.map((listing, i) => (
                  <ListingCard key={listing.id} listing={listing} index={i} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}

export default function BuscarPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-12 text-center text-muted-foreground">Cargando...</div>}>
      <BuscarContent />
    </Suspense>
  );
}
