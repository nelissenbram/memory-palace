"use client";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";

const TYPE_KEYS: [string, string, string][] = [
  ["photo","\u{1F5BC}\uFE0F","typePhotos"],["painting","\u{1F3A8}","typePaintings"],["video","\u{1F3AC}","typeVideos"],["album","\u{1F4D6}","typeAlbums"],
  ["orb","\u{1F52E}","typeOrbs"],["case","\u{1F3FA}","typeVitrines"],["audio","\u{1F3B5}","typeAudio"],["document","\u{1F4DC}","typeDocs"],
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
  const { t } = useTranslation("searchBar");
  const color=accent||T.color.terracotta;
  const isFiltering=!!query||!!filterType;

  return(
    <div style={{position:"absolute",top:isMobile?"3.125rem":"3.875rem",left:isMobile?"0.5rem":"1.375rem",right:isMobile?"0.5rem":undefined,zIndex:30,animation:"fadeIn .5s ease .4s both",display:"flex",flexDirection:"column",gap:"0.5rem",maxWidth:isMobile?undefined:"min(320px, calc(100vw - 44px))"}}>
      {/* Search input */}
      <div style={{background:`${T.color.white}ee`,backdropFilter:"blur(10px)",borderRadius:"0.75rem",border:`1px solid ${T.color.cream}`,padding:isMobile?"0.5rem 0.75rem":"0.375rem 0.625rem",display:"flex",alignItems:"center",gap:"0.5rem"}}>
        <span style={{fontSize:"0.8125rem",opacity:.5}}>🔍</span>
        <input
          value={query}
          onChange={e=>onQueryChange(e.target.value)}
          placeholder={t("placeholder")}
          style={{flex:1,border:"none",background:"transparent",fontFamily:T.font.body,fontSize:isMobile?"1rem":"0.75rem",color:T.color.charcoal,outline:"none",padding:isMobile?"0.375rem 0":"0.25rem 0"}}
        />
        {isFiltering&&<button onClick={()=>{onQueryChange("");onFilterChange(null);}} aria-label="Clear filter" style={{background:"none",border:"none",color:T.color.muted,fontSize:"0.75rem",cursor:"pointer",padding:"0.125rem 0.25rem"}}>✕</button>}
      </div>

      {/* Type filter pills */}
      <div style={{display:"flex",flexWrap:"wrap",gap:"0.25rem"}}>
        {TYPE_KEYS.map(([val,icon,labelKey])=>{
          const active=filterType===val;
          return(
            <button key={val} onClick={()=>onFilterChange(active?null:val)}
              style={{padding:isMobile?"0.5rem 0.75rem":"0.25rem 0.625rem",borderRadius:"1rem",border:active?`1.5px solid ${color}`:`1px solid ${T.color.cream}`,
                background:active?`${color}15`:`${T.color.white}cc`,backdropFilter:"blur(8px)",
                fontFamily:T.font.body,fontSize:isMobile?"0.75rem":"0.625rem",color:active?color:T.color.muted,
                cursor:"pointer",display:"flex",alignItems:"center",gap:isMobile?"0.3125rem":"0.1875rem",transition:"all .15s",minHeight:isMobile?"2.25rem":undefined}}>
              <span style={{fontSize:isMobile?"0.8125rem":"0.625rem"}}>{icon}</span>{t(labelKey)}
            </button>
          );
        })}
      </div>

      {/* Result count */}
      {isFiltering&&<div style={{fontFamily:T.font.body,fontSize:"0.625rem",color:T.color.muted,paddingLeft:"0.125rem"}}>
        {t("showing", { filtered: String(filteredCount), total: String(totalCount) })}
      </div>}
    </div>
  );
}
