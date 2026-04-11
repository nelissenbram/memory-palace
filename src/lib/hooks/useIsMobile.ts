"use client";
import { useState, useEffect } from "react";

/** Returns true when the device is phone-sized — either viewport width < 768px
 *  (portrait phones / small tablets) OR viewport height < 500px (phones in
 *  landscape, where width exceeds 768 but the device is still a phone). */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px), (max-height: 500px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setMobile(e.matches);
    handler(mq);
    mq.addEventListener("change", handler as (e: MediaQueryListEvent) => void);
    return () => mq.removeEventListener("change", handler as (e: MediaQueryListEvent) => void);
  }, []);
  return mobile;
}

/** Returns true when viewport width < 480px */
export function useIsSmall(): boolean {
  const [small, setSmall] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 479px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setSmall(e.matches);
    handler(mq);
    mq.addEventListener("change", handler as (e: MediaQueryListEvent) => void);
    return () => mq.removeEventListener("change", handler as (e: MediaQueryListEvent) => void);
  }, []);
  return small;
}
