import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useIMEComposing } from "../hooks/useIMEComposing";

describe("useIMEComposing", () => {
  it("isComposing returns false initially", () => {
    const { result } = renderHook(() => useIMEComposing());
    expect(result.current.isComposing()).toBe(false);
  });

  it("isComposing returns true during composition", () => {
    const { result } = renderHook(() => useIMEComposing());

    act(() => {
      result.current.onCompositionStart();
    });

    expect(result.current.isComposing()).toBe(true);
  });

  it("isComposing returns true within 100ms after compositionEnd", () => {
    const { result } = renderHook(() => useIMEComposing());

    act(() => {
      result.current.onCompositionStart();
      result.current.onCompositionEnd();
    });

    // Immediately after compositionEnd, should still be "composing" (within 100ms grace)
    expect(result.current.isComposing()).toBe(true);
  });

  it("isComposing returns false after 100ms grace period", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useIMEComposing());

    act(() => {
      result.current.onCompositionStart();
      result.current.onCompositionEnd();
    });

    vi.advanceTimersByTime(101);

    expect(result.current.isComposing()).toBe(false);

    vi.useRealTimers();
  });
});
