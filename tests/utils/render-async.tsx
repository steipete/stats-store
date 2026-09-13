import { act, render } from "@testing-library/react";
import { Suspense } from "react";

// Helper to render async server components in tests
export async function renderAsync(component: React.ReactElement) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
  );

  const result = render(component, { wrapper: Wrapper });

  await act(async () => {});

  return result;
}
