/// <reference types="vite/client" />
import * as React from "react";
import { createRootRoute, HeadContent, Link as TSRLink, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import { Toaster, LinkProvider } from "@allcoba/ui";

import { DefaultCatchBoundary } from "#/components/DefaultCatchBoundary";
import { NotFound } from "#/components/NotFound";
import appCss from "#/styles/app.css?url";
import { seo } from "#/utils/seo";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      ...seo({
        title: "Allcoba — Conecta sin exponerte",
        description: "Encuentra y conecta con proveedores de servicios de forma privada y segura.",
      }),
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico" },
    ],
  }),
  errorComponent: DefaultCatchBoundary,
  notFoundComponent: () => <NotFound />,
  shellComponent: RootDocument,
});

const TanStackLinkAdapter = React.forwardRef<any, any>(({ href, to, ...props }, ref) => {
  return <TSRLink to={href || to} ref={ref} {...props} />;
});
TanStackLinkAdapter.displayName = "TanStackLinkAdapter";

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full antialiased">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <LinkProvider component={TanStackLinkAdapter}>{children}</LinkProvider>
        <Toaster richColors position="bottom-center" />
        <TanStackRouterDevtools position="bottom-right" />
        <Scripts />
      </body>
    </html>
  );
}
