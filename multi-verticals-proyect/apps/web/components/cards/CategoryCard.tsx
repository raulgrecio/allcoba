import Link from "next/link";
import {
  Car, Bike, HeartPulse, Dumbbell, Wrench, Package,
  ShoppingBag, Home, Smartphone, Camera, BookOpen, Music,
} from "lucide-react";
import type { Category } from "@/types";

const ICON_MAP: Record<string, React.ElementType> = {
  car: Car,
  bike: Bike,
  "heart-pulse": HeartPulse,
  dumbbell: Dumbbell,
  wrench: Wrench,
  package: Package,
  "shopping-bag": ShoppingBag,
  home: Home,
  smartphone: Smartphone,
  camera: Camera,
  "book-open": BookOpen,
  music: Music,
};

interface CategoryCardProps {
  category: Category;
}

export function CategoryCard({ category }: CategoryCardProps) {
  const Icon = ICON_MAP[category.icon] ?? Package;

  return (
    <Link href={`/${category.vertical}?categoria=${category.slug}`}>
      <div className="group flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-card border border-border hover-elevate cursor-pointer text-center">
        <div className="p-3 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200">
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs font-semibold leading-tight">{category.name}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {category.count.toLocaleString("es-ES")} anuncios
          </p>
        </div>
      </div>
    </Link>
  );
}
