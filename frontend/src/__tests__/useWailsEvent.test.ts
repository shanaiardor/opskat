import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useWailsEvent } from "../hooks/useWailsEvent";
import { EventsOn, EventsOff } from "../../wailsjs/runtime/runtime";

describe("useWailsEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("subscribes to event on mount", () => {
    const handler = vi.fn();
    renderHook(() => useWailsEvent("test:event", handler));

    expect(EventsOn).toHaveBeenCalledWith("test:event", handler);
  });

  it("unsubscribes on unmount", () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useWailsEvent("test:event", handler));

    unmount();

    expect(EventsOff).toHaveBeenCalledWith("test:event");
  });

  it("resubscribes when event name changes", () => {
    const handler = vi.fn();
    const { rerender } = renderHook(({ eventName }) => useWailsEvent(eventName, handler), {
      initialProps: { eventName: "event:a" },
    });

    expect(EventsOn).toHaveBeenCalledWith("event:a", handler);

    rerender({ eventName: "event:b" });

    expect(EventsOff).toHaveBeenCalledWith("event:a");
    expect(EventsOn).toHaveBeenCalledWith("event:b", handler);
  });
});
