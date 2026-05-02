import type { Meta, StoryObj } from "@storybook/react";
import { FooterShell } from "./FooterShell";

const AnchorLink = ({ href, className, children }: React.ComponentProps<"a">) => (
  <a href={href} className={className}>{children}</a>
);

const FOOTER_SECTIONS = [
  {
    title: "Explorar",
    links: [
      { label: "Coches", href: "/automocion" },
      { label: "Motos", href: "/automocion/motos" },
      { label: "Servicios", href: "/servicios" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacidad", href: "/privacidad" },
      { label: "Términos", href: "/terminos" },
    ],
  },
];

const meta: Meta<typeof FooterShell> = {
  title: "Shells/FooterShell",
  component: FooterShell,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
  args: {
    sections: FOOTER_SECTIONS,
    LinkComponent: AnchorLink,
  },
};
export default meta;
type Story = StoryObj<typeof FooterShell>;

export const Default: Story = {};
