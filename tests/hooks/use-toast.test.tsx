import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";

describe("useToast", () => {
  it("limits toast list to 1 and dismisses", async () => {
    vi.resetModules();
    const { useToast } = await import("../../hooks/use-toast");

    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: "A" });
    });

    await waitFor(() => expect(result.current.toasts).toHaveLength(1));
    expect(result.current.toasts[0]?.title).toBe("A");

    act(() => {
      result.current.toast({ title: "B" });
    });

    await waitFor(() => expect(result.current.toasts).toHaveLength(1));
    expect(result.current.toasts[0]?.title).toBe("B");

    act(() => {
      result.current.dismiss();
    });

    await waitFor(() => expect(result.current.toasts[0]?.open).toBe(false));
  });

  it("updates toast content", async () => {
    vi.resetModules();
    const { useToast } = await import("../../hooks/use-toast");

    const { result } = renderHook(() => useToast());

    const handle = (() => {
      let toastHandle: ReturnType<typeof result.current.toast> | undefined;
      act(() => {
        toastHandle = result.current.toast({ title: "A" });
      });
      return toastHandle;
    })();

    await waitFor(() => expect(result.current.toasts).toHaveLength(1));

    act(() => {
      handle?.update({ id: handle.id, open: true, title: "Updated" });
    });

    await waitFor(() => expect(result.current.toasts[0]?.title).toBe("Updated"));
  });
});
