"use client";
import { T } from "@/lib/theme";

const TYPES: [string, string, string][] = [
  ["photo","\u{1F5BC}\uFE0F","Photos"],["video","\u{1F3AC}","Videos"],["album","\u{1F4D6}","Albums"],
  ["orb","\u{1F52E}","Orbs"],["journal","\u{1F4DC}","Journals"],["case","\u{1F3FA}","Vitrines"],
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
  const color=accent||T.color.terracotta;
  const isFiltering=!!query||!!filterType;

  return(
    <div style={{position:"absolute",top:62,left:22,zIndex:30,animation:"fadeIn .5s ease .4s both",display:"flex",flexDirection:"column",gap:8,maxWidth:320}}>
      {/* Search input */}
      <div style={{background:`${T.color.white}ee`,backdropFilter:"blur(10px)",borderRadius:12,border:`1px solid ${T.color.cream}`,padding:"6px 10px",display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:13,opacity:.5}}>🔍</span>
        <input
          value={query}
          onChange={e=>onQueryChange(e.target.value)}
          placeholder="Search memories..."
          style={{flex:1,border:"none",background:"transparent",fontFamily:T.font.body,fontSize:12,color:T.color.charcoal,outline:"none",padding:"4px 0"}}
        />
        {isFiltering&&<button onClick={()=>{onQueryChange("");onFilterChange(null);}} style={{background:"none",border:"none",color:T.color.muted,fontSize:12,cursor:"pointer",padding:"2px 4px"}}>✕</button>}
      </div>

      {/* Type filter pills */}
      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
        {TYPES.map(([val,icon,label])=>{
          const active=filterType===val;
          return(
            <button key={val} onClick={()=>onFilterChange(active?null:val)}
              style={{padding:"4px 10px",borderRadius:16,border:active?`1.5px solid ${color}`:`1px solid ${T.color.cream}`,
                background:active?`${color}15`:`${T.color.white}cc`,backdropFilter:"blur(8px)",
                fontFamily:T.font.body,fontSize:10,color:active?color:T.color.muted,
                cursor:"pointer",display:"flex",alignItems:"center",gap:3,transition:"all .15s"}}>
              <span style={{fontSize:10}}>{icon}</span>{label}
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
