import type { Meta, StoryObj } from "@storybook/react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./card";
import { Button } from "./button";

const meta: Meta<typeof Card> = {
  title: "Primitives/Card",
  component: Card,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Título de la card</CardTitle>
        <CardDescription>Descripción secundaria de apoyo.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Contenido de la card.</p>
      </CardContent>
      <CardFooter className="gap-2">
        <Button size="sm">Aceptar</Button>
        <Button size="sm" variant="outline">Cancelar</Button>
      </CardFooter>
    </Card>
  ),
};
