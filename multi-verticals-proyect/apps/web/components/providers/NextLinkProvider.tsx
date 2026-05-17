"use client";

import * as React from "react";
import NextLink from "next/link";
import { LinkProvider } from "@allcoba/ui";

interface NextLinkProviderProps {
  children: React.ReactNode;
}

export function NextLinkProvider({ children }: NextLinkProviderProps) {
  return (
    <LinkProvider component={NextLink}>
      {children}
    </LinkProvider>
  );
}
