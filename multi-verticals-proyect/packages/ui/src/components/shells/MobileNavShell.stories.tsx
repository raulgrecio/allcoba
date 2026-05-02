import type { Meta, StoryObj } from "@storybook/react";
import { Home, Search, Plus, MessageCircle, User } from "lucide-react";
import { MobileNavShell } from "./MobileNavShell";

const AnchorLink = ({ href, className, children }: React.ComponentProps<"a">) => (
  <a href={href} className={className}>{children}</a>
);

const NAV_ITEMS = [
  { href: "/", icon: Home, label: "Inicio" },
  { href: "/buscar", icon: Search, label: "Buscar" },
  { href: "/publicar", icon: Plus, label: "Publicar", accent: true },
  { href: "/mensajes", icon: MessageCircle, label: "Mensajes" },
  { href: "/perfil", icon: User, label: "Perfil" },
];

const meta: Meta<typeof MobileNavShell> = {
  title: "Shells/MobileNavShell",
  component: MobileNavShell,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
  args: {
    items: NAV_ITEMS,
    LinkComponent: AnchorLink,
  },
};
export default meta;
type Story = StoryObj<typeof MobileNavShell>;

export const Default: Story = {
  args: { pathname: "/" },
};

export const ActiveMessages: Story = {
  args: { pathname: "/mensajes" },
};
