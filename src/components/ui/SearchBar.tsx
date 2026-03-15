"use client";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";

const TYPES: [string, string, string][] = [
  ["photo","\u{1F5BC}\uFE0F","Photos"],["painting","\u{1F3A8}","Paintings"],["video","\u{1F3AC}","Videos"],["album","\u{1F4D6}","Albums"],
  ["orb","\u{1F52E}","Orbs"],["case","\u{1F3FA}","Vitrines"],["audio","\u{1F3B5}","Audio"],["document","\u{1F4DC}","Docs"],
];

interface SearchBarProps {
  query: string;
  filterType: string | null;
  totalCount: number;
  filteredCount: number;
  accent?: string;
  onQueryChange: (q: string) => void;
  onFilterChange: (type: string | null) => void;
}

export default function SearchBar({query,filterType,totalCount,filteredCount,accent,onQueryChange,onFilterChange}: SearchBarProps){
  const isMobile = useIsMobile();
  const color=accent||T.color.terracotta;
  const isFiltering=!!query||!!filterType;

  return(
    <div style={{position:"absolute",top:isMobile?50:62,left:isMobile?8:22,right:isMobile?8:undefined,zIndex:30,animation:"fadeIn .5s ease .4s both",display:"flex",flexDirection:"column",gap:8,maxWidth:isMobile?undefined:"min(320px, calc(100vw - 44px))"}}>
      {/* Search input */}
      <div style={{background:`${T.color.white}ee`,backdropFilter:"blur(10px)",borderRadius:12,border:`1px solid ${T.color.cream}`,padding:isMobile?"8px 12px":"6px 10px",display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:13,opacity:.5}}>🔍</span>
        <input
          value={query}
          onChange={e=>onQueryChange(e.target.value)}
          placeholder="Search memories..."
          style={{flex:1,border:"none",background:"transparent",fontFamily:T.font.body,fontSize:isMobile?16:12,color:T.color.charcoal,outline:"none",padding:isMobile?"6px 0":"4px 0"}}
        />
        {isFiltering&&<button onClick={()=>{onQueryChange("");onFilterChange(null);}} style={{background:"none",border:"none",color:T.color.muted,fontSize:12,cursor:"pointer",padding:"2px 4px"}}>✕</button>}
      </div>

      {/* Type filter pills */}
      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
        {TYPES.map(([val,icon,label])=>{
          const active=filterType===val;
          return(
            <button key={val} onClick={()=>onFilterChange(active?null:val)}
              style={{padding:isMobile?"8px 12px":"4px 10px",borderRadius:16,border:active?`1.5px solid ${color}`:`1px solid ${T.color.cream}`,
                background:active?`${color}15`:`${T.color.white}cc`,backdropFilter:"blur(8px)",
                fontFamily:T.font.body,fontSize:isMobile?12:10,color:active?color:T.color.muted,
                cursor:"pointer",display:"flex",alignItems:"center",gap:isMobile?5:3,transition:"all .15s",minHeight:isMobile?36:undefined}}>
              <span style={{fontSize:isMobile?13:10}}>{icon}</span>{label}
            </button>
          );
        })}
      </div>

      {/* Result count */}
      {isFiltering&&<div style={{fontFamily:T.font.body,fontSize:10,color:T.color.muted,paddingLeft:2}}>
        Showing {filteredCount} of {totalCount} memories
      </div>}
    </div>
  );
}
