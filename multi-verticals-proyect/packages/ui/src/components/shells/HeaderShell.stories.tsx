import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { HeaderShell } from "./HeaderShell";
import type { HeaderUser } from "./HeaderShell";

const AnchorLink = ({ href, className, children, ...rest }: React.ComponentProps<"a">) => (
  <a href={href} className={className} {...rest}>{children}</a>
);

const HEADER_CATEGORIES = [
  { label: "Todos", href: "/buscar" },
  { label: "Coches", href: "/automocion" },
  { label: "Motos", href: "/automocion/motos" },
  { label: "Servicios", href: "/servicios" },
];

const MOCK_USER: HeaderUser = {
  name: "Juan",
  avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=face",
};

const meta: Meta<typeof HeaderShell> = {
  title: "Shells/HeaderShell",
  component: HeaderShell,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  argTypes: {
    user: {
      control: "select",
      options: ["guest", "logged"],
      mapping: { guest: undefined, logged: MOCK_USER },
      description: "Estado de autenticación",
    },
  },
  args: {
    categories: HEADER_CATEGORIES,
    onSearch: fn(),
    onNavigate: fn(),
    LinkComponent: AnchorLink,
    user: undefined,
  },
};
export default meta;
type Story = StoryObj<typeof HeaderShell>;

export const Guest: Story = {
  args: {
    categories: HEADER_CATEGORIES,
    user: undefined,
  },
};

export const LoggedIn: Story = {
  args: {
    user: MOCK_USER,
    categories: HEADER_CATEGORIES.map((c, i) => ({ ...c, active: i === 1 })),
  },
};

export const ActiveCategory: Story = {
  args: {
    user: MOCK_USER,
    categories: HEADER_CATEGORIES.map((c) => ({ ...c, active: c.href === "/automocion" })),
  },
};
