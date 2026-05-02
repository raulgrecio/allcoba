import type { Meta, StoryObj } from "@storybook/react";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

const meta: Meta<typeof Avatar> = {
  title: "Primitives/Avatar",
  component: Avatar,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof Avatar>;

export const WithImage: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop" alt="Usuario" />
      <AvatarFallback>CV</AvatarFallback>
    </Avatar>
  ),
};

export const Fallback: Story = {
  render: () => (
    <Avatar>
      <AvatarFallback className="bg-primary/10 text-primary font-bold">AB</AvatarFallback>
    </Avatar>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      {(["w-8 h-8", "w-10 h-10", "w-12 h-12", "w-16 h-16"] as const).map((size) => (
        <Avatar key={size} className={size}>
          <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">AB</AvatarFallback>
        </Avatar>
      ))}
    </div>
  ),
};
