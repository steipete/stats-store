import { fireEvent, render, screen } from "@testing-library/react";
import { type ReactNode, useState } from "react";
import { expect, it, vi } from "vitest";
import { RealtimeWrapper } from "@/components/realtime-wrapper";

vi.mock("@/components/realtime-dashboard", () => ({
  RealtimeDashboard: ({ children }: { children: ReactNode }) => {
    const [count, setCount] = useState(0);
    return (
      <div>
        {children}
        <button type="button" onClick={() => setCount((value) => value + 1)}>
          Local state {count}
        </button>
      </div>
    );
  },
}));
it("keeps server children inside the dashboard and resets client state on an app switch", () => {
  const initialData = {
    kpis: { unique_installs: 1, reports_this_period: 1, latest_version: "1.0" },
  };
  const { rerender } = render(
    <RealtimeWrapper selectedAppId="first" initialData={initialData}>
      <div>Server charts</div>
    </RealtimeWrapper>,
  );
  expect(screen.getByText("Server charts")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button"));
  expect(screen.getByRole("button")).toHaveTextContent("Local state 1");
  rerender(
    <RealtimeWrapper selectedAppId="second" initialData={initialData}>
      <div>New charts</div>
    </RealtimeWrapper>,
  );
  expect(screen.getByText("New charts")).toBeInTheDocument();
  expect(screen.getByRole("button")).toHaveTextContent("Local state 0");
});
