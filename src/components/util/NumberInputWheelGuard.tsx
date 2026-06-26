"use client";

import { useEffect } from "react";

/**
 * Prevents scroll-wheel from accidentally changing the value of focused
 * <input type="number"> fields by blurring them on wheel. Mounted once at the
 * app root. Replaces a previous inline <script> tag (which React does not run
 * on client renders).
 */
export function NumberInputWheelGuard() {
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      const target = e.target as HTMLInputElement | null;
      if (target && target.type === "number") target.blur();
    };
    document.addEventListener("wheel", onWheel, { passive: true });
    return () => document.removeEventListener("wheel", onWheel);
  }, []);

  return null;
}
