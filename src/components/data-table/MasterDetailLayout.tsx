import type { ReactNode } from "react";

type MasterDetailLayoutProps = {
  children: ReactNode;
  detail: ReactNode;
  isDetailOpen: boolean;
  className?: string;
};

export function MasterDetailLayout({
  children,
  detail,
  isDetailOpen,
  className = "",
}: MasterDetailLayoutProps) {
  return (
    <div
      className={`lg:grid lg:items-start ${
        isDetailOpen
          ? "lg:grid-cols-[minmax(0,52%)_minmax(0,48%)]"
          : "lg:grid-cols-1"
      } ${className}`}
    >
      <div className="min-w-0 overflow-x-hidden">{children}</div>
      {detail}
    </div>
  );
}
