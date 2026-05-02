import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { HeaderShell } from "./HeaderShell";

const AnchorLink = ({ href, className, children, ...rest }: React.ComponentProps<"a">) => (
  <a href={href} className={className} {...rest}>{children}</a>
);

const HEADER_CATEGORIES = [
  { label: "Todos", href: "/buscar" },
  { label: "Coches", href: "/automocion" },
  { label: "Motos", href: "/automocion/motos" },
  { label: "Servicios", href: "/servicios" },
];

const meta: Meta<typeof HeaderShell> = {
  title: "Shells/HeaderShell",
  component: HeaderShell,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
  args: {
    categories: HEADER_CATEGORIES,
    onSearch: fn(),
    onNavigate: fn(),
    LinkComponent: AnchorLink,
  },
};
export default meta;
type Story = StoryObj<typeof HeaderShell>;

export const Default: Story = {
  args: { pathname: "/" },
};

export const ActiveCategory: Story = {
  args: { pathname: "/automocion" },
};
