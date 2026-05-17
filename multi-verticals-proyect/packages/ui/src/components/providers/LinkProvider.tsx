import * as React from "react";

export interface BaseLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  to?: string;
  children: React.ReactNode;
}

const DefaultLink = React.forwardRef<HTMLAnchorElement, BaseLinkProps>(
  ({ href, to, children, ...props }, ref) => {
    const destination = href || to || "#";
    return (
      <a href={destination} ref={ref} {...props}>
        {children}
      </a>
    );
  }
);
DefaultLink.displayName = "DefaultLink";

const LinkContext = React.createContext<React.ComponentType<any>>(DefaultLink);

export interface LinkProviderProps {
  component: React.ComponentType<any>;
  children: React.ReactNode;
}

export function LinkProvider({ component, children }: LinkProviderProps) {
  return (
    <LinkContext.Provider value={component}>
      {children}
    </LinkContext.Provider>
  );
}

export function useLinkComponent() {
  return React.useContext(LinkContext);
}

export const Link = React.forwardRef<any, any>(({ href, to, ...props }, ref) => {
  const LinkComponent = useLinkComponent();
  const path = href || to;
  return <LinkComponent href={path} to={path} ref={ref} {...props} />;
});
Link.displayName = "Link";
