"use client";

import { useEffect, useRef, useCallback } from "react";

// Reference-counted body scroll lock so the background doesn't scroll/rubber-band
// behind a modal (HIG Modality). A counter keeps nested modals from unlocking early.
let scrollLockCount = 0;
function lockBodyScroll() {
  if (typeof document === "undefined") return;
  scrollLockCount += 1;
  if (scrollLockCount === 1) {
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "contain";
  }
}
function unlockBodyScroll() {
  if (typeof document === "undefined") return;
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) {
    document.body.style.overflow = "";
    document.body.style.overscrollBehavior = "";
  }
}

export function useFocusTrap(active: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    lockBodyScroll();
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus first focusable element
    const container = containerRef.current;
    if (!container) return;

    const focusable = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length > 0) {
      requestAnimationFrame(() => { focusable[0]?.focus(); });
    }

    return () => {
      unlockBodyScroll();
      // Return focus on unmount
      previousFocusRef.current?.focus();
    };
  }, [active]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!containerRef.current) return;

    if (e.key === "Tab") {
      const focusable = containerRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, []);

  return { containerRef, handleKeyDown };
}
