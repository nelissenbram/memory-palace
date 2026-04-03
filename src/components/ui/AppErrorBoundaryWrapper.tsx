"use client";

import ErrorBoundary from "./ErrorBoundary";

export default function AppErrorBoundaryWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
