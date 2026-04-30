"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ListingCard } from "@/components/molecules/ListingCard";
import { cn } from "@/lib/utils";
import type { Listing } from "@/types";

interface ListingCarouselProps {
  listings: Listing[];
}

export function ListingCarousel({ listings }: ListingCarouselProps) {
  const ref = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    ref.current?.scrollBy({ left: dir === "left" ? -640 : 640, behavior: "smooth" });
  };

  return (
    <div className="relative group/carousel">
      <div
        ref={ref}
        className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0"
      >
        {listings.map((listing, i) => (
          <div
            key={listing.id}
            className="snap-start flex-none w-[10rem] sm:w-[11rem] md:w-[12rem]"
          >
            <ListingCard listing={listing} index={i} variant="carousel" />
          </div>
        ))}
      </div>

      {/* Desktop nav arrows */}
      <button
        onClick={() => scroll("left")}
        aria-label="Anterior"
        className={cn(
          "hidden md:flex absolute -left-5 top-1/2 -translate-y-1/2 z-10",
          "w-10 h-10 rounded-full bg-card border border-border shadow-md",
          "items-center justify-center text-foreground",
          "opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200",
          "hover:bg-muted"
        )}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={() => scroll("right")}
        aria-label="Siguiente"
        className={cn(
          "hidden md:flex absolute -right-5 top-1/2 -translate-y-1/2 z-10",
          "w-10 h-10 rounded-full bg-card border border-border shadow-md",
          "items-center justify-center text-foreground",
          "opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200",
          "hover:bg-muted"
        )}
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
