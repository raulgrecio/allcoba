import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, SlidersHorizontal, X, Grid2X2, List } from "lucide-react";
import {
  Input,
  Button,
  buttonVariants,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Separator,
  ListingGrid,
  CONDITION_LABELS,
  cn,
} from "@allcoba/ui";
import type { Condition, Vertical } from "@allcoba/ui";
import { SiteLayout } from "#/components/layout/SiteLayout";
import { LISTINGS } from "#/lib/mock-data";

interface SearchParams {
  q?: string;
  vertical?: Vertical | "all";
  condition?: Condition | "all";
  sort?: string;
}

export const Route = createFileRoute("/buscar")({
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    return {
      q: (search.q as string) || undefined,
      vertical: (search.vertical as Vertical) || "all",
      condition: (search.condition as Condition) || "all",
      sort: (search.sort as string) || "recent",
    };
  },
  component: BuscarPage,
});

const VERTICALS: { value: Vertical | "all"; label: string }[] = [
  { value: "all", label: "Todo" },
  { value: "automocion", label: "Automoción" },
  { value: "masajes", label: "Masajes" },
];

const CONDITIONS = Object.entries(CONDITION_LABELS) as [Condition, string][];

function BuscarPage() {
  const { q = "", vertical = "all", condition = "all", sort = "recent" } = Route.useSearch();
  const navigate = Route.useNavigate();

  const [localQ, setLocalQ] = useState(q);
  const [view, setView] = useState<"grid" | "list">("grid");

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
    navigate({
      search: (prev) => ({
        ...prev,
        q: localQ.trim() || undefined,
      }),
    });
  };

  const setVerticalFilter = (value: Vertical | "all") => {
    navigate({
      search: (prev) => ({
        ...prev,
        vertical: value === "all" ? undefined : value,
      }),
    });
  };

  const setConditionFilter = (value: Condition | "all") => {
    navigate({
      search: (prev) => ({
        ...prev,
        condition: value === "all" ? undefined : value,
      }),
    });
  };

  const setSortOrder = (value: string) => {
    navigate({
      search: (prev) => ({
        ...prev,
        sort: value === "recent" ? undefined : value,
      }),
    });
  };

  const activeFilters = [
    vertical !== "all" && VERTICALS.find((v) => v.value === vertical)?.label,
    condition !== "all" && CONDITION_LABELS[condition],
  ].filter(Boolean) as string[];

  function FiltersPanel() {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <p className="text-sm font-bold mb-2 text-foreground">Vertical</p>
          {VERTICALS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setVerticalFilter(value)}
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
          <p className="text-sm font-bold mb-2 text-foreground">Estado</p>
          {[
            { value: "all" as const, label: "Cualquier estado" },
            ...CONDITIONS.map(([v, l]) => ({ value: v as Condition | "all", label: l })),
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setConditionFilter(value)}
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
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Search bar */}
        <form onSubmit={handleSearch} className="mb-4">
          <div className="relative flex items-center max-w-[32rem]">
            <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Busca en Allcoba..."
              value={localQ}
              onChange={(e) => setLocalQ(e.target.value)}
              className="pl-9 pr-24 rounded-full h-11 text-sm"
            />
            <Button
              type="submit"
              size="sm"
              className="absolute right-1.5 rounded-full h-8"
            >
              Buscar
            </Button>
          </div>
        </form>

        {/* Active filters */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {activeFilters.map((f) => (
              <Badge key={f} variant="secondary" className="gap-1 px-2.5 py-0.5">
                {f}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => {
                    navigate({
                      search: (prev) => ({
                        ...prev,
                        vertical: undefined,
                        condition: undefined,
                      }),
                    });
                  }}
                />
              </Badge>
            ))}
          </div>
        )}

        <div className="flex gap-6">
          {/* Sidebar — desktop */}
          <aside className="hidden md:block w-56 shrink-0">
            <div className="sticky top-24 bg-card border border-border rounded-2xl p-4">
              <p className="font-bold mb-4 text-foreground">Filtros</p>
              <FiltersPanel />
            </div>
          </aside>

          {/* Results */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4 gap-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-bold text-foreground">{filtered.length}</span> resultados
                {q && ` para "${q}"`}
              </p>
              <div className="flex items-center gap-2">
                {/* Mobile filter */}
                <Sheet>
                  <SheetTrigger
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "md:hidden gap-1.5 rounded-full h-9"
                    )}
                  >
                    <SlidersHorizontal className="w-4 h-4" /> Filtros
                    {activeFilters.length > 0 && (
                      <Badge className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[0.625rem] bg-primary text-primary-foreground">
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

                <Select value={sort} onValueChange={(v) => v && setSortOrder(v)}>
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
                    type="button"
                    onClick={() => setView("grid")}
                    className={cn(
                      "p-2 transition-colors",
                      view === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <Grid2X2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("list")}
                    className={cn(
                      "p-2 transition-colors",
                      view === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <p className="text-lg font-bold mb-2 text-foreground">Sin resultados</p>
                <p className="text-sm">Prueba con otros términos o quita los filtros.</p>
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
