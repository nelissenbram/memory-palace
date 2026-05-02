"use client";
import { useState, useCallback } from "react";
import { signOut } from "@/lib/auth/actions";

/**
 * Hook that wraps signOut with immediate visual feedback.
 * Shows a full-screen overlay and handles the redirect client-side
 * as a fallback if the server action hangs.
 */
export function useSignOut() {
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    // Fallback: if the server action doesn't redirect within 3s, force navigate
    const fallback = setTimeout(() => {
      window.location.href = "/login";
    }, 3000);
    try {
      await signOut();
    } catch {
      // Server action error — fallback navigation below handles it
    }
    clearTimeout(fallback);
    // If we're still here, force navigate
    window.location.href = "/login";
  }, []);

  return { signingOut, handleSignOut };
}
