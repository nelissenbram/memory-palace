"use client";
import { T } from "@/lib/theme";

interface ContributorBannerProps {
  ownerName: string;
  permission: string;
}

export default function ContributorBanner({ ownerName, permission }: ContributorBannerProps) {
  const isContributor = permission === "contribute" || permission === "admin";

  return (
    <div style={{
      position: "absolute",
      top: 56,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 30,
      animation: "fadeIn .5s ease .5s both",
      display: "flex",
      alignItems: "center",
      gap: 8,
      background: `${T.color.white}ee`,
      backdropFilter: "blur(10px)",
      borderRadius: 12,
      padding: "8px 16px",
      border: `1px solid ${isContributor ? T.color.sage + "40" : T.color.cream}`,
      boxShadow: "0 2px 12px rgba(44,44,42,.1)",
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: 4,
        background: isContributor ? T.color.sage : T.color.terracotta,
      }} />
      <span style={{
        fontFamily: T.font.body, fontSize: 12,
        color: isContributor ? T.color.sage : T.color.walnut,
        fontWeight: 500,
      }}>
        {isContributor
          ? `Contributing to ${ownerName}'s palace`
          : `Viewing ${ownerName}'s memories`
        }
      </span>
    </div>
  );
}
