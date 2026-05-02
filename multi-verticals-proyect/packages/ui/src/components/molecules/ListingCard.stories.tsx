import type { Meta, StoryObj } from "@storybook/react";
import { LISTING_FIXTURES } from "../../lib/fixtures";
import { ListingCard } from "./ListingCard";

const meta: Meta<typeof ListingCard> = {
  title: "Molecules/ListingCard",
  component: ListingCard,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  argTypes: {
    variant: { control: "select", options: ["grid", "carousel"] },
  },
};
export default meta;
type Story = StoryObj<typeof ListingCard>;

export const Grid: Story = {
  args: { listing: LISTING_FIXTURES[0], variant: "grid" },
  decorators: [(Story) => <div className="w-64"><Story /></div>],
};

export const Carousel: Story = {
  args: { listing: LISTING_FIXTURES[0], variant: "carousel" },
  decorators: [(Story) => <div className="w-48"><Story /></div>],
};

export const Favorite: Story = {
  args: { listing: { ...LISTING_FIXTURES[1], isFavorite: true }, variant: "grid" },
  decorators: [(Story) => <div className="w-64"><Story /></div>],
};

export const Reserved: Story = {
  args: { listing: LISTING_FIXTURES[3], variant: "grid" },
  decorators: [(Story) => <div className="w-64"><Story /></div>],
};

export const Sold: Story = {
  args: { listing: { ...LISTING_FIXTURES[0], status: "sold" as const }, variant: "grid" },
  decorators: [(Story) => <div className="w-64"><Story /></div>],
};

export const GridOfFour: Story = {
  render: () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {LISTING_FIXTURES.map((l, i) => (
        <ListingCard key={l.id} listing={l} index={i} />
      ))}
    </div>
  ),
};
