import type { Meta, StoryObj } from "@storybook/react";
import { Skeleton } from "./skeleton";

const meta: Meta<typeof Skeleton> = {
  title: "Primitives/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Default: Story = {
  render: () => <Skeleton className="h-4 w-48" />,
};

export const ListingCardSkeleton: Story = {
  render: () => (
    <div className="w-48 space-y-2">
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-3 w-36" />
      <Skeleton className="h-3 w-28" />
    </div>
  ),
};

export const AvatarSkeleton: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  ),
};
