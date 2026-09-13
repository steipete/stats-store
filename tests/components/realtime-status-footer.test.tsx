import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { RealtimeStatusFooter } from "@/components/realtime-status-footer";
vi.mock("framer-motion", async () => import("@/tests/utils/motion"));
const controls = { showActivityFeed: false, activityId: "activity", onToggleActivityFeed: vi.fn() };
it("keeps connection status and activity controls visible without any events", () => {
  render(<RealtimeStatusFooter {...controls} isConnected={false} realtimeEventsCount={0} />);
  expect(screen.getByText("Real-time updates disconnected")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Activity Feed/ })).toBeInTheDocument();
});
it("delegates toggling to the owner and describes the controlled panel", () => {
  const onToggleActivityFeed = vi.fn();
  const { rerender } = render(
    <RealtimeStatusFooter
      {...controls}
      onToggleActivityFeed={onToggleActivityFeed}
      isConnected
      realtimeEventsCount={3}
    />,
  );
  const button = screen.getByRole("button");
  expect(button).toHaveAttribute("aria-controls", "activity");
  expect(button).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(button);
  expect(onToggleActivityFeed).toHaveBeenCalledOnce();
  rerender(
    <RealtimeStatusFooter
      {...controls}
      onToggleActivityFeed={onToggleActivityFeed}
      isConnected
      realtimeEventsCount={3}
      showActivityFeed
    />,
  );
  expect(button).toHaveAttribute("aria-expanded", "true");
});
