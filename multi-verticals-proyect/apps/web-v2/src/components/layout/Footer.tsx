import type { FooterSection } from "@allcoba/ui";
import { FooterShell } from "@allcoba/ui";

const SECTIONS: FooterSection[] = [
  {
    title: "Compra",
    links: [
      { label: "Cómo comprar", href: "/ayuda/comprar" },
      { label: "Protección al comprador", href: "/ayuda/proteccion" },
      { label: "Categorías", href: "/buscar" },
    ],
  },
  {
    title: "Vende",
    links: [
      { label: "Publicar anuncio", href: "/publicar" },
      { label: "Cómo vender", href: "/ayuda/vender" },
      { label: "Consejos de seguridad", href: "/ayuda/seguridad" },
    ],
  },
  {
    title: "Allcoba",
    links: [
      { label: "Sobre nosotros", href: "/sobre" },
      { label: "Blog", href: "/blog" },
      { label: "Prensa", href: "/prensa" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Términos de uso", href: "/legal/terminos" },
      { label: "Privacidad", href: "/legal/privacidad" },
      { label: "Cookies", href: "/legal/cookies" },
    ],
  },
];

export function Footer() {
  return <FooterShell sections={SECTIONS} />;
}
