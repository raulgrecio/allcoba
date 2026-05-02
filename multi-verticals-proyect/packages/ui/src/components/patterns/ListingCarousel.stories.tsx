import type { Meta, StoryObj } from "@storybook/react";
import { LISTING_FIXTURES } from "../../lib/fixtures";
import { ListingCarousel } from "./ListingCarousel";

const meta: Meta<typeof ListingCarousel> = {
  title: "Patterns/ListingCarousel",
  component: ListingCarousel,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
};
export default meta;
type Story = StoryObj<typeof ListingCarousel>;

export const Default: Story = {
  args: { listings: LISTING_FIXTURES },
  decorators: [(Story) => <div className="max-w-3xl"><Story /></div>],
};

export const Few: Story = {
  args: { listings: LISTING_FIXTURES.slice(0, 2) },
  decorators: [(Story) => <div className="max-w-3xl"><Story /></div>],
};
