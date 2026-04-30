import Link from "next/link";

const LINKS = {
  Compra: [
    { label: "Cómo comprar", href: "/ayuda/comprar" },
    { label: "Protección al comprador", href: "/ayuda/proteccion" },
    { label: "Categorías", href: "/buscar" },
  ],
  Vende: [
    { label: "Publicar anuncio", href: "/publicar" },
    { label: "Cómo vender", href: "/ayuda/vender" },
    { label: "Consejos de seguridad", href: "/ayuda/seguridad" },
  ],
  Allcoba: [
    { label: "Sobre nosotros", href: "/sobre" },
    { label: "Blog", href: "/blog" },
    { label: "Prensa", href: "/prensa" },
  ],
  Legal: [
    { label: "Términos de uso", href: "/legal/terminos" },
    { label: "Privacidad", href: "/legal/privacidad" },
    { label: "Cookies", href: "/legal/cookies" },
  ],
};

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-card text-sm text-muted-foreground">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {Object.entries(LINKS).map(([section, items]) => (
            <div key={section}>
              <p className="font-semibold text-foreground mb-3">{section}</p>
              <ul className="space-y-2">
                {items.map(({ label, href }) => (
                  <li key={href}>
                    <Link href={href} className="hover:text-primary transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-black text-xs leading-none">A</span>
            </div>
            <span className="font-display font-bold text-foreground">allcoba</span>
          </div>
          <p className="text-xs">
            © {new Date().getFullYear()} Allcoba. Conecta sin exponerte.
          </p>
        </div>
      </div>
    </footer>
  );
}
