import type { Meta, StoryObj } from "@storybook/react";
import { ScrollArea } from "./scroll-area";

const meta: Meta<typeof ScrollArea> = {
  title: "Primitives/ScrollArea",
  component: ScrollArea,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof ScrollArea>;

export const Default: Story = {};
