import type { Meta, StoryObj } from "@storybook/react";
import { LISTING_FIXTURES } from "../../lib/fixtures";
import { ListingGrid } from "./ListingGrid";

const meta: Meta<typeof ListingGrid> = {
  title: "Patterns/ListingGrid",
  component: ListingGrid,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
};
export default meta;
type Story = StoryObj<typeof ListingGrid>;

export const Default: Story = {
  args: { listings: LISTING_FIXTURES },
};

export const TwoCols: Story = {
  args: { listings: LISTING_FIXTURES, cols: "grid-cols-2" },
  decorators: [(Story) => <div className="max-w-sm"><Story /></div>],
};
