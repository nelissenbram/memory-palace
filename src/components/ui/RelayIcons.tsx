"use client";

/**
 * RelayIcons — the crafted 24x24 stroke-icon set for the Atrium relay board.
 * One consistent idiom (currentColor stroke, round caps, 1.6 weight) so the
 * whole menu reads as a single designed system. Zero emoji, zero clip-art.
 */

import React from "react";

function S({ children }: { children: React.ReactNode }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "block" }}>
      {children}
    </svg>
  );
}

export const RelayIcons: Record<string, React.FC> = {
  palace: () => (<S><path d="M3 10 L12 4 L21 10" /><path d="M5 10v9M9.5 10v9M14.5 10v9M19 10v9" /><path d="M3 19h18" /><path d="M3 21h18" /></S>),
  library: () => (<S><rect x="4" y="4" width="5.5" height="16" rx="0.6" /><rect x="11" y="4" width="5.5" height="16" rx="0.6" /><path d="M18 6 L21 6.6 L19 20 L16.5 19.4" /><path d="M6.75 8h0.01M13.75 8h0.01" /></S>),
  map: () => (<S><path d="M12 21c4-4.2 6-7.2 6-10a6 6 0 1 0-12 0c0 2.8 2 5.8 6 10z" /><circle cx="12" cy="11" r="2.2" /></S>),
  timeline: () => (<S><path d="M4 12h16" /><circle cx="7" cy="12" r="1.6" /><circle cx="12.5" cy="12" r="1.6" /><circle cx="18" cy="12" r="1.6" /><path d="M7 12V8M12.5 12v8M18 12V7" /></S>),
  insights: () => (<S><path d="M4 20V4" /><path d="M4 20h16" /><rect x="7" y="12" width="2.6" height="5" rx="0.4" /><rect x="11.7" y="8" width="2.6" height="9" rx="0.4" /><rect x="16.4" y="14" width="2.6" height="3" rx="0.4" /></S>),
  family: () => (<S><circle cx="12" cy="6" r="2.4" /><circle cx="6" cy="18" r="2.4" /><circle cx="18" cy="18" r="2.4" /><path d="M12 8.4v3.6M12 12H6v3.6M12 12h6v3.6" /></S>),
  explore: () => (<S><circle cx="12" cy="12" r="8.5" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></S>),
  shared: () => (<S><circle cx="8" cy="9" r="2.4" /><path d="M3.5 19c0-2.6 2-4.4 4.5-4.4S12.5 16.4 12.5 19" /><circle cx="16.5" cy="7.5" r="2" /><path d="M14 13.5c2.2-0.8 6 0.2 6 4.5" /></S>),
  photos: () => (<S><rect x="3.5" y="5.5" width="17" height="13" rx="1.5" /><circle cx="9" cy="10.5" r="1.6" /><path d="M4 17l4.5-4 3 2.5L16 11l4 5" /></S>),
  restore: () => (<S><path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2" /><circle cx="12" cy="12" r="3" /></S>),
  write: () => (<S><path d="M15 4l5 5-11 11H4v-5z" /><path d="M13 6l5 5" /></S>),
  record: () => (<S><rect x="9" y="3" width="6" height="10" rx="3" /><path d="M6 11a6 6 0 0 0 12 0" /><path d="M12 17v3.5M9 20.5h6" /></S>),
  whatsapp: () => (<S><path d="M4 20l1.4-4A7.5 7.5 0 1 1 8 18.6z" /><path d="M9 10c0 3 2 5 5 5" /></S>),
  gallery: () => (<S><rect x="3.5" y="3.5" width="7" height="7" rx="1" /><rect x="13.5" y="3.5" width="7" height="7" rx="1" /><rect x="3.5" y="13.5" width="7" height="7" rx="1" /><rect x="13.5" y="13.5" width="7" height="7" rx="1" /></S>),
  capsule: () => (<S><circle cx="12" cy="13" r="7.5" /><path d="M12 9.5V13l2.5 1.5" /><path d="M9 3.5h6" /><path d="M12 3.5V6" /></S>),
  organize: () => (<S><path d="M3.5 6.5h6l1.5 2h9.5v9a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 17.5z" /><path d="M8 13h8M8 16h5" /></S>),
  familyGroup: () => (<S><circle cx="9" cy="8" r="2.6" /><circle cx="16.5" cy="9.5" r="2" /><path d="M3.5 19c0-3 2.4-5 5.5-5s5.5 2 5.5 5" /><path d="M15 14.2c2.6.2 5 2 5 4.8" /></S>),
  publish: () => (<S><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.4 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.4-3.5-8.5S9.6 5.9 12 3.5z" /></S>),
  invite: () => (<S><circle cx="9" cy="8" r="3" /><path d="M3.5 19.5c0-3.2 2.5-5.5 5.5-5.5s5.5 2.3 5.5 5.5" /><path d="M18 7v6M15 10h6" /></S>),
  journeys: () => (<S><path d="M6 21V5a2 2 0 0 1 2-2" /><path d="M6 5h11l-2 3 2 3H6" /><circle cx="6" cy="21" r="0.6" /></S>),
  milestones: () => (<S><circle cx="12" cy="9" r="5.5" /><path d="M9.2 13.5L8 21l4-2.2L16 21l-1.2-7.5" /><path d="M12 6.5l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3z" /></S>),
  profile: () => (<S><circle cx="12" cy="8" r="3.4" /><path d="M4.5 20c0-4 3.3-6.5 7.5-6.5S19.5 16 19.5 20" /></S>),
  legacy: () => (<S><path d="M12 21c-5-2.5-7.5-6-7.5-10V5.5L12 3l7.5 2.5V11c0 4-2.5 7.5-7.5 10z" /><path d="M12 12.5c-1.2-1-2.2-1.8-2.2-3a1.3 1.3 0 0 1 2.2-.8 1.3 1.3 0 0 1 2.2.8c0 1.2-1 2-2.2 3z" /></S>),
  settings: () => (<S><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></S>),
  help: () => (<S><circle cx="12" cy="12" r="8.5" /><path d="M9.5 9.5a2.5 2.5 0 0 1 4.5 1.5c0 1.6-2 2-2 3.5" /><path d="M12 17.5h0.01" /></S>),
  continue: () => (<S><path d="M5 4l12 8-12 8z" /></S>),
  // score: a faceted gem. badges: a ribboned rosette. (distinct from milestones)
  points: () => (<S><path d="M6 3h12l3 5-9 13L3 8z" /><path d="M3 8h18M9 3l-3 5 6 13 6-13-3-5" /></S>),
  badge: () => (<S><circle cx="12" cy="8.5" r="5" /><path d="M12 6.2l0.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z" /><path d="M8.7 12.7 L7 20l5-2.5 5 2.5-1.7-7.3" /></S>),
};

export default RelayIcons;
