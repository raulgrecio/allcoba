import { AppLogo } from "../molecules/AppLogo";
import { useLinkComponent } from "../providers/LinkProvider";

interface BaseLinkProps {
  href: string;
  className?: string;
  children: React.ReactNode;
}

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterSection {
  title: string;
  links: FooterLink[];
}

export interface FooterShellProps {
  sections: FooterSection[];
  brandName?: string;
  tagline?: string;
  year?: number;
  LinkComponent?: React.ComponentType<BaseLinkProps>;
}

export function FooterShell({
  sections,
  brandName = "allcoba",
  tagline = "Conecta sin exponerte.",
  year = new Date().getFullYear(),
  LinkComponent,
}: FooterShellProps) {
  const ContextLink = useLinkComponent();
  const ActiveLink = LinkComponent || ContextLink;

  return (
    <footer className="mt-auto border-t border-border bg-card text-sm text-muted-foreground">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {sections.map(({ title, links }) => (
            <div key={title}>
              <p className="font-semibold text-foreground mb-3">{title}</p>
              <ul className="space-y-2">
                {links.map(({ label, href }) => (
                  <li key={href}>
                    <ActiveLink href={href} className="hover:text-primary transition-colors">
                      {label}
                    </ActiveLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <AppLogo size="sm" />
          <p className="text-xs">
            © {year} {brandName}. {tagline}
          </p>
        </div>
      </div>
    </footer>
  );
}
