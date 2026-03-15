"use client";
import { useState } from "react";
import { T } from "@/lib/theme";
import { signOut } from "@/lib/auth/actions";
import { useUserStore } from "@/lib/stores/userStore";
import { usePalaceStore } from "@/lib/stores/palaceStore";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useRoomStore } from "@/lib/stores/roomStore";
import { useTrackStore } from "@/lib/stores/trackStore";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import type { Crumb } from "@/lib/hooks/useNavigation";

interface TopBarProps {
  crumbs: Crumb[];
}

export default function TopBar({crumbs}: TopBarProps){
  const isMobile = useIsMobile();
  const { userName } = useUserStore();
  const { activeWing, switchWing } = usePalaceStore();
  const { showDirectory, setShowDirectory } = useMemoryStore();
  const { getWings } = useRoomStore();
  const WINGS = getWings();
  const [menuOpen, setMenuOpen] = useState(false);

  // Mobile: show only current location + menu toggle
  if (isMobile) {
    return (
      <>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 48,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 12px", zIndex: 40,
          background: "linear-gradient(180deg,rgba(221,213,200,.95),rgba(221,213,200,0))",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6, flexShrink: 0,
              background: `linear-gradient(135deg,${T.color.warmStone},${T.color.sandstone})`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12,
              border: `1px solid ${T.color.sandstone}`,
            }}>{"\u{1F3DB}\uFE0F"}</div>
            {/* Current location breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, overflow: "hidden", minWidth: 0 }}>
              {crumbs.map((c, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 3, minWidth: 0 }}>
                  {i > 0 && <span style={{ fontFamily: T.font.body, fontSize: 10, color: T.color.muted, flexShrink: 0 }}>/</span>}
                  {c.action ? (
                    <button onClick={c.action} style={{
                      fontFamily: T.font.display, fontSize: i === crumbs.length - 1 ? 14 : 12,
                      fontWeight: 500, color: i === crumbs.length - 1 ? T.color.charcoal : T.color.muted,
                      background: "none", border: "none", cursor: "pointer", padding: 0,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      textDecoration: "underline", textDecorationColor: `${T.color.sandstone}88`,
                      textUnderlineOffset: 3, minWidth: 0,
                    }}>{c.label}</button>
                  ) : (
                    <span style={{
                      fontFamily: T.font.display, fontSize: i === crumbs.length - 1 ? 14 : 12,
                      fontWeight: 500, color: T.color.charcoal,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0,
                    }}>{c.label}</span>
                  )}
                </span>
              ))}
            </div>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            border: `1px solid ${T.color.cream}`,
            background: menuOpen ? `${T.color.sandstone}30` : `${T.color.white}bb`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, cursor: "pointer", color: T.color.muted,
          }}>
            {menuOpen ? "\u2715" : "\u2630"}
          </button>
        </div>
        {/* Mobile menu overlay */}
        {menuOpen && (
          <div onClick={() => setMenuOpen(false)} style={{
            position: "absolute", inset: 0, zIndex: 39, background: "rgba(42,34,24,.3)",
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              position: "absolute", top: 48, right: 8, left: 8,
              background: `${T.color.linen}f5`, backdropFilter: "blur(16px)",
              borderRadius: 14, border: `1px solid ${T.color.cream}`,
              boxShadow: "0 8px 40px rgba(44,44,42,.15)", padding: 12,
              animation: "fadeUp .2s ease",
            }}>
              {userName && (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  marginBottom: 10, padding: "0 4px",
                }}>
                  <span style={{
                    fontFamily: T.font.display, fontSize: 14, fontStyle: "italic",
                    color: T.color.walnut,
                  }}>
                    {userName}&#39;s Palace
                  </span>
                  <LevelBadgeMobile />
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
                {WINGS.map(w => (
                  <button key={w.id} onClick={() => { switchWing(w.id); setMenuOpen(false); }} style={{
                    padding: "10px 12px", borderRadius: 10,
                    fontFamily: T.font.body, fontSize: 13, fontWeight: activeWing === w.id ? 600 : 400,
                    border: activeWing === w.id ? `1.5px solid ${w.accent}` : `1px solid ${T.color.cream}`,
                    background: activeWing === w.id ? `${w.accent}15` : T.color.white,
                    color: activeWing === w.id ? w.accent : T.color.muted,
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                    textAlign: "left", minHeight: 44,
                  }}>
                    <span style={{ fontSize: 16 }}>{w.icon}</span>{w.name}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setShowDirectory(!showDirectory); setMenuOpen(false); }} style={{
                  flex: 1, padding: "10px 12px", borderRadius: 10, minHeight: 44,
                  border: `1px solid ${T.color.cream}`, background: T.color.white,
                  fontFamily: T.font.body, fontSize: 12, color: T.color.walnut, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}>
                  {"\u{1F4C2}"} Directory
                </button>
                <a href="/settings" onClick={() => setMenuOpen(false)} style={{
                  flex: 1, padding: "10px 12px", borderRadius: 10, minHeight: 44,
                  border: `1px solid ${T.color.cream}`, background: T.color.white,
                  fontFamily: T.font.body, fontSize: 12, color: T.color.walnut, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  textDecoration: "none",
                }}>
                  {"\u2699\uFE0F"} Settings
                </a>
                <button onClick={() => { signOut(); setMenuOpen(false); }} style={{
                  flex: 1, padding: "10px 12px", borderRadius: 10, minHeight: 44,
                  border: `1px solid ${T.color.cream}`, background: T.color.white,
                  fontFamily: T.font.body, fontSize: 12, color: T.color.muted, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}>
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop: original layout
  return(
    <div style={{position:"absolute",top:0,left:0,right:0,height:54,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 22px",zIndex:40,background:"linear-gradient(180deg,rgba(221,213,200,.92),rgba(221,213,200,0))"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:30,height:30,borderRadius:7,background:`linear-gradient(135deg,${T.color.warmStone},${T.color.sandstone})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,border:`1px solid ${T.color.sandstone}`}}>{"\u{1F3DB}\uFE0F"}</div>
          <button onClick={()=>setShowDirectory(!showDirectory)} title="Directory" style={{width:30,height:30,borderRadius:7,border:`1px solid ${showDirectory?T.color.sandstone:T.color.cream}`,background:showDirectory?`${T.color.sandstone}30`:`${T.color.white}bb`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,cursor:"pointer",color:T.color.muted}}>{"\u{1F4C2}"}</button>
          {userName&&<span style={{fontFamily:T.font.display,fontSize:13,fontStyle:"italic",color:T.color.walnut}}>{userName}&#39;s Palace</span>}
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            {crumbs.map((c,i)=><span key={i} style={{display:"flex",alignItems:"center",gap:4}}>
              {i>0&&<span style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted}}>/</span>}
              {c.action?<button onClick={c.action} style={{fontFamily:T.font.display,fontSize:i===0?15:13,fontWeight:500,color:i===crumbs.length-1?T.color.charcoal:T.color.muted,background:"none",border:"none",cursor:"pointer",textDecoration:"underline",textDecorationColor:`${T.color.sandstone}88`,textUnderlineOffset:3,padding:0}}>{c.label}</button>
              :<span style={{fontFamily:T.font.display,fontSize:i===0?15:13,fontWeight:500,color:T.color.charcoal}}>{c.label}</span>}
            </span>)}
          </div>
        </div>
      </div>
      <div style={{display:"flex",gap:4}}>{WINGS.map(w=><button key={w.id} onClick={()=>switchWing(w.id)} style={{padding:"4px 10px",borderRadius:16,fontFamily:T.font.body,fontSize:11,fontWeight:activeWing===w.id?600:400,border:activeWing===w.id?`1.5px solid ${w.accent}`:`1px solid ${T.color.cream}`,background:activeWing===w.id?`${w.accent}15`:`${T.color.white}bb`,color:activeWing===w.id?w.accent:T.color.muted,cursor:"pointer",display:"flex",alignItems:"center",gap:3}}>
        <span style={{fontSize:11}}>{w.icon}</span>{w.name}</button>)}
        <button onClick={()=>signOut()} style={{padding:"4px 10px",borderRadius:16,fontFamily:T.font.body,fontSize:11,fontWeight:400,border:`1px solid ${T.color.cream}`,background:`${T.color.white}bb`,color:T.color.muted,cursor:"pointer",marginLeft:4}}>Sign out</button>
      </div>
    </div>
  );
}

/** Compact level badge for the mobile menu header */
function LevelBadgeMobile() {
  const { totalPoints, getLevelInfo } = useTrackStore();
  const levelInfo = getLevelInfo();

  if (totalPoints === 0) return null;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 5,
      padding: "3px 8px 3px 4px", borderRadius: 12,
      background: `${levelInfo.color}10`,
      border: `1px solid ${levelInfo.color}20`,
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: 9,
        background: `linear-gradient(135deg, ${levelInfo.color}, ${levelInfo.color}cc)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 9, fontWeight: 700, color: "#FFF", fontFamily: T.font.body,
      }}>
        {levelInfo.rank}
      </div>
      <span style={{
        fontFamily: T.font.body, fontSize: 10, fontWeight: 500,
        color: levelInfo.color,
      }}>
        {levelInfo.title}
      </span>
      <span style={{
        fontFamily: T.font.body, fontSize: 9, color: T.color.muted,
      }}>
        {totalPoints} MP
      </span>
    </div>
  );
}
