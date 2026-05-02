import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./input";

const meta: Meta<typeof Input> = {
  title: "Primitives/Input",
  component: Input,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = { args: { placeholder: "Escribe algo..." } };
export const Search: Story = { args: { type: "search", placeholder: "Buscar..." } };
export const Disabled: Story = { args: { placeholder: "Deshabilitado", disabled: true } };
export const WithValue: Story = { args: { defaultValue: "valor inicial" } };
