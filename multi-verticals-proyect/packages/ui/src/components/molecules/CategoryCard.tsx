import {
  Car, Bike, HeartPulse, Dumbbell, Wrench, Package,
  ShoppingBag, Home, Smartphone, Camera, BookOpen, Music,
} from "lucide-react";
import type { Category } from "../../types";
import { useLinkComponent } from "../providers/LinkProvider";

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

interface BaseLinkProps {
  href: string;
  className?: string;
  children: React.ReactNode;
}

interface CategoryCardProps {
  category: Category;
  LinkComponent?: React.ComponentType<BaseLinkProps>;
}

export function CategoryCard({ category, LinkComponent }: CategoryCardProps) {
  const Icon = ICON_MAP[category.icon] ?? Package;
  const ContextLink = useLinkComponent();
  const ActiveLink = LinkComponent || ContextLink;

  return (
    <ActiveLink href={`/${category.vertical}?categoria=${category.slug}`} className="block">
      <div className="group flex flex-col items-center gap-[0.625rem] p-[1rem] rounded-[1rem] bg-card border border-border hover-elevate cursor-pointer text-center transition-all duration-300">
        <div className="p-[0.75rem] rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
          <Icon className="w-[1.5rem] h-[1.5rem]" />
        </div>
        <div>
          <p className="text-[0.75rem] font-bold leading-tight">{category.name}</p>
          <p className="text-[0.625rem] text-muted-foreground mt-[0.125rem] font-medium">
            {category.count.toLocaleString("es-ES")} anuncios
          </p>
        </div>
      </div>
    </ActiveLink>
  );
}
