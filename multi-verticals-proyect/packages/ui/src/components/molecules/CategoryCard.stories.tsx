import type { Meta, StoryObj } from "@storybook/react";
import { CATEGORY_FIXTURES } from "../../lib/fixtures";
import { CategoryCard } from "./CategoryCard";

const meta: Meta<typeof CategoryCard> = {
  title: "Molecules/CategoryCard",
  component: CategoryCard,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
};
export default meta;
type Story = StoryObj<typeof CategoryCard>;

export const Default: Story = {
  args: { category: CATEGORY_FIXTURES[0] },
  decorators: [(Story) => <div className="w-28"><Story /></div>],
};

export const AllCategories: Story = {
  render: () => (
    <div className="grid grid-cols-4 gap-3 max-w-sm">
      {CATEGORY_FIXTURES.map((c) => (
        <CategoryCard key={c.id} category={c} />
      ))}
    </div>
  ),
};
