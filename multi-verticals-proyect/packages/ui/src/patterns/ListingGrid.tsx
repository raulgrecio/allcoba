import { ListingCard } from "../molecules/ListingCard";
import type { Listing } from "../types";
import { cn } from "../lib/utils";

interface ListingGridProps {
  listings: Listing[];
  className?: string;
  cols?: string;
}

export function ListingGrid({ listings, className, cols }: ListingGridProps) {
  return (
    <div
      className={cn(
        cols || "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
        "grid gap-[0.5rem] md:gap-[1rem]",
        className
      )}
    >
      {listings.map((listing, i) => (
        <ListingCard key={listing.id} listing={listing} index={i} />
      ))}
    </div>
  );
}
