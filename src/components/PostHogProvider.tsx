"use client";
import { useEffect } from "react";
import { initAnalytics } from "@/lib/analytics";

export default function PostHogProvider() {
  useEffect(() => {
    initAnalytics();
  }, []);
  return null;
}
