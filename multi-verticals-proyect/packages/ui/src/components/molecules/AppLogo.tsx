import { cn } from "../../lib/utils";

interface AppLogoProps {
  size?: "sm" | "md";
  responsiveText?: boolean;
  className?: string;
}

export function AppLogo({ size = "md", responsiveText = false, className }: AppLogoProps) {
  return (
    <div className={cn("flex items-center", size === "sm" ? "gap-2" : "gap-2.5", className)}>
      <div className={cn(
        "bg-primary flex items-center justify-center flex-shrink-0",
        size === "sm" ? "w-6 h-6 rounded-lg" : "w-9 h-9 md:w-10 md:h-10 rounded-xl"
      )}>
        <span className={cn(
          "text-primary-foreground font-display font-black leading-none",
          size === "sm" ? "text-xs" : "text-sm md:text-base"
        )}>
          A
        </span>
      </div>
      <span className={cn(
        "font-display font-bold text-foreground tracking-tight",
        size === "sm" ? "text-base" : "text-xl",
        responsiveText && "hidden sm:block"
      )}>
        allcoba
      </span>
    </div>
  );
}
