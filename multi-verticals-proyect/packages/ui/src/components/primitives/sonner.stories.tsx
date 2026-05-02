import type { Meta, StoryObj } from "@storybook/react";
import { Sonner } from "./sonner";

const meta: Meta<typeof Sonner> = {
  title: "Primitives/Sonner",
  component: Sonner,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof Sonner>;

export const Default: Story = {};
