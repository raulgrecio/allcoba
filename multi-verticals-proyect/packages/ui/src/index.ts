// Types
export type {
  Vertical,
  Condition,
  ListingStatus,
  Category,
  Seller,
  Listing,
  MarketplaceStats,
} from "./types";

// Lib
export { cn } from "./lib/utils";
export { CONDITION_LABELS, formatPrice, timeAgo } from "./lib/format";

// Primitives
export { Button, buttonVariants } from "./components/primitives/button";
export { Input } from "./components/primitives/input";
export { Badge, badgeVariants } from "./components/primitives/badge";
export { Avatar, AvatarImage, AvatarFallback } from "./components/primitives/avatar";
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from "./components/primitives/card";
export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./components/primitives/dialog";
export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./components/primitives/dropdown-menu";
export { Label } from "./components/primitives/label";
export { ScrollArea, ScrollBar } from "./components/primitives/scroll-area";
export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/primitives/select";
export { Separator } from "./components/primitives/separator";
export { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./components/primitives/sheet";
export { Skeleton } from "./components/primitives/skeleton";
export { Toaster } from "./components/primitives/sonner";
export { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/primitives/tabs";

// Molecules
export { AppLogo } from "./components/molecules/AppLogo";
export { ListingCard } from "./components/molecules/ListingCard";
export { CategoryCard } from "./components/molecules/CategoryCard";

// Shells
export { HeaderShell } from "./components/shells/HeaderShell";
export type { HeaderShellProps, HeaderNavItem, HeaderUser } from "./components/shells/HeaderShell";
export { FooterShell } from "./components/shells/FooterShell";
export type { FooterShellProps, FooterSection, FooterLink } from "./components/shells/FooterShell";
export { MobileNavShell } from "./components/shells/MobileNavShell";
export type { MobileNavShellProps, MobileNavItem } from "./components/shells/MobileNavShell";

// Patterns
export { ListingCarousel } from "./components/patterns/ListingCarousel";
export { ListingGrid } from "./components/patterns/ListingGrid";

// Providers & Agnostic Link
export { LinkProvider, useLinkComponent, Link } from "./components/providers/LinkProvider";
export type { BaseLinkProps, LinkProviderProps } from "./components/providers/LinkProvider";
