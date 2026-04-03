"use client";
import { useCallback, useEffect, useRef } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { WINGS } from "@/lib/constants/wings";
import { HERO_IMG } from "@/lib/constants/defaults";
import Image from "next/image";
import { useUserStore } from "@/lib/stores/userStore";
import { useWalkthroughStore } from "@/lib/stores/walkthroughStore";
import { useTranslation } from "@/lib/hooks/useTranslation";

interface OnboardingWizardProps {
  onFinish: () => void;
}

export default function OnboardingWizard({onFinish}: OnboardingWizardProps){
  const isMobile = useIsMobile();
  const { t } = useTranslation("onboarding");
  const { t: tc } = useTranslation("common");
  const { t: tw } = useTranslation("wings");
  const wizardRef = useRef<HTMLDivElement>(null);
  const { onboardStep, userName, firstWing, styleEra,
    setOnboardStep, setUserName, setUserGoal, setFirstWing, setStyleEra, setOnboarded } = useUserStore();

  // Default goal to "preserve" since we removed the goal step
  const ensureGoal = () => { useUserStore.getState().setUserGoal("preserve"); };

  const eraOptions = [
    { id: "roman", img: "/textures/onboarding/roman_villa.jpg", fallbackColor: T.era.roman.primary },
    { id: "renaissance", img: "/textures/onboarding/renaissance_palazzo.jpg", fallbackColor: T.era.renaissance.primary },
  ];

  const steps=[
    // Step 0: Welcome + Name (combined)
    ()=>(
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",gap:"1.25rem",animation:"fadeUp .6s ease"}}>
        <h1 style={{fontFamily:T.font.display,fontSize:isMobile?"2rem":"2.375rem",fontWeight:300,color:T.color.charcoal,letterSpacing:".5px",lineHeight:1.2}}>{t("welcomeTitle")}<br/><span style={{fontWeight:600,fontStyle:"italic"}}>{t("appName")}</span></h1>
        <div style={{width:"100%",maxWidth:"26.25rem",borderRadius:"1rem",overflow:"hidden",boxShadow:"0 0.5rem 2.5rem rgba(44,44,42,.18)",border:`0.1875rem solid ${T.color.sandstone}44`}}>
          <Image src={HERO_IMG} alt={t("welcomeTitle") + " — " + t("appName")} width={840} height={630} priority style={{width:"100%",height:"auto",display:"block"}}/>
        </div>
        <p style={{fontFamily:T.font.body,fontSize:"1rem",color:T.color.muted,maxWidth:"25rem",lineHeight:1.6}}>{t("welcomeDescription")}</p>
        <div style={{width:"100%",maxWidth:"21.25rem"}}>
          <p style={{fontFamily:T.font.body,fontSize:"0.875rem",color:T.color.sandstone,marginBottom:"0.75rem"}}>{t("whatToCallYou")}</p>
          <input value={userName} onChange={e=>setUserName(e.target.value)} placeholder={t("namePlaceholder")}
            style={{fontFamily:T.font.display,fontSize:"1.375rem",textAlign:"center",padding:"0.75rem 1.5rem",border:`0.125rem solid ${T.color.sandstone}`,borderRadius:"0.75rem",background:T.color.linen,color:T.color.charcoal,outline:"none",width:"100%",transition:"border-color .2s"}}
            onFocus={e=>{e.target.style.borderColor=T.color.terracotta;}} onBlur={e=>{e.target.style.borderColor=T.color.sandstone;}}
            autoFocus onKeyDown={e=>{if(e.key==="Enter"&&userName.trim())setOnboardStep(1);}}/>
        </div>
      </div>
    ),
    // Step 1: Style choice — Roman vs Renaissance
    ()=>(
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",gap:"1.25rem",animation:"fadeUp .6s ease"}}>
        <h2 style={{fontFamily:T.font.display,fontSize:isMobile?"1.5rem":"1.75rem",fontWeight:400,color:T.color.charcoal}}>
          {t("styleChoiceTitle")}
        </h2>
        <div style={{display:"flex",flexDirection:isMobile?"column":"row",gap:"1rem",width:"100%",maxWidth:"32.5rem"}}>
          {eraOptions.map(era=>{
            const isComingSoon = era.id === "renaissance";
            const selected = styleEra === era.id && !isComingSoon;
            const borderColor = selected ? (era.id === "roman" ? T.era.roman.secondary : T.era.renaissance.accent) : T.color.cream;
            return (
              <button key={era.id} onClick={()=>{ if (!isComingSoon) setStyleEra(era.id); }}
                aria-pressed={styleEra === era.id && !isComingSoon}
                onMouseEnter={e=>{if(!isComingSoon){(e.currentTarget as HTMLElement).style.boxShadow="0 0.375rem 1.5rem rgba(0,0,0,.14)";(e.currentTarget as HTMLElement).style.transform="translateY(-0.125rem)";}}}
                onMouseLeave={e=>{if(!isComingSoon){(e.currentTarget as HTMLElement).style.boxShadow=selected?"0 0.25rem 1.25rem rgba(0,0,0,.1)":"0 0.125rem 0.5rem rgba(0,0,0,.04)";(e.currentTarget as HTMLElement).style.transform="none";}}}
                style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"0.75rem",padding:"1rem",borderRadius:"1rem",
                  border:`0.1875rem solid ${borderColor}`,
                  background:selected?`${borderColor}12`:T.color.linen,
                  cursor:isComingSoon?"default":"pointer",
                  opacity:isComingSoon?0.55:1,
                  transition:"all .25s",
                  boxShadow:selected?"0 0.25rem 1.25rem rgba(0,0,0,.1)":"0 0.125rem 0.5rem rgba(0,0,0,.04)"}}>
                <div style={{width:"100%",aspectRatio:"4/3",borderRadius:"0.75rem",overflow:"hidden",
                  background:era.fallbackColor,position:"relative",filter:isComingSoon?"grayscale(0.5)":"none"}}>
                  <Image src={era.img} alt={t(era.id === "roman" ? "styleRomanDesc" : "styleRenaissanceDesc")}
                    fill sizes="(max-width: 768px) 100vw, 260px"
                    style={{objectFit:"cover"}}/>
                  {selected && <div style={{position:"absolute",top:"0.5rem",right:"0.5rem",width:"1.75rem",height:"1.75rem",borderRadius:"50%",
                    background:borderColor,display:"flex",alignItems:"center",justifyContent:"center",
                    color:"#FFF",fontSize:"1rem",fontWeight:700}}>{"\u2713"}</div>}
                  {isComingSoon && <div style={{position:"absolute",bottom:"0.5rem",left:"50%",transform:"translateX(-50%)",
                    background:"rgba(0,0,0,.6)",color:"#FFF",fontFamily:T.font.body,fontSize:"0.75rem",fontWeight:600,
                    padding:"0.25rem 0.875rem",borderRadius:"1.25rem",whiteSpace:"nowrap",letterSpacing:".5px",
                    textTransform:"uppercase"}}>{t("comingSoon")}</div>}
                </div>
                <div style={{fontFamily:T.font.display,fontSize:isMobile?"1.125rem":"1.25rem",fontWeight:600,color:isComingSoon?T.color.muted:T.color.charcoal}}>
                  {t(era.id === "roman" ? "styleRoman" : "styleRenaissance")}
                </div>
                <div style={{fontFamily:T.font.body,fontSize:"0.8125rem",color:T.color.muted,lineHeight:1.4}}>
                  {t(era.id === "roman" ? "styleRomanDesc" : "styleRenaissanceDesc")}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    ),
    // Step 2: Pick your first wing
    ()=>(
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",gap:"1.125rem",animation:"fadeUp .6s ease"}}>
        <h2 style={{fontFamily:T.font.display,fontSize:isMobile?"1.5rem":"1.75rem",fontWeight:400,color:T.color.charcoal}}>
          {userName ? t("chooseFirstWingPersonal", { name: userName }) : t("chooseFirstWing")}
        </h2>
        <p style={{fontFamily:T.font.body,fontSize:"0.9375rem",color:T.color.muted,maxWidth:"25rem"}}>{t("wingDescriptionShort")}</p>
        <div style={{display:"flex",flexDirection:"column",gap:"0.5rem",width:"100%",maxWidth:"26.25rem"}}>
          {WINGS.map(w=>(
            <button key={w.id} onClick={()=>setFirstWing(w.id)}
              aria-pressed={firstWing===w.id}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=firstWing===w.id?`${w.accent}22`:`${T.color.cream}`;(e.currentTarget as HTMLElement).style.transform="translateY(-0.0625rem)";}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background=firstWing===w.id?`${w.accent}15`:T.color.linen;(e.currentTarget as HTMLElement).style.transform="none";}}
              style={{display:"flex",alignItems:"center",gap:"0.875rem",padding:"0.875rem 1.125rem",borderRadius:"0.875rem",
                border:`0.125rem solid ${firstWing===w.id?w.accent:T.color.cream}`,
                background:firstWing===w.id?`${w.accent}15`:T.color.linen,cursor:"pointer",textAlign:"left",transition:"all .2s"}}>
              <div style={{fontSize:"1.625rem",width:"2.5rem",textAlign:"center",flexShrink:0}}>{w.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:T.font.display,fontSize:"1.0625rem",fontWeight:500,color:T.color.charcoal}}>{tw(w.nameKey)}</div>
                <div style={{fontFamily:T.font.body,fontSize:"0.75rem",color:T.color.muted}}>{tw(w.descKey)}</div>
              </div>
              {firstWing===w.id&&<div style={{color:w.accent,fontSize:"1.125rem"}}>{"\u2713"}</div>}
            </button>
          ))}
        </div>
      </div>
    ),
    // Step 3: Ready — short confirmation
    ()=>(
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",gap:"1.25rem",animation:"fadeUp .6s ease"}}>
        <div style={{fontSize:"3.5rem",lineHeight:1}}>{"\uD83C\uDFDB\uFE0F"}</div>
        <h2 style={{fontFamily:T.font.display,fontSize:isMobile?"1.75rem":"2.125rem",fontWeight:400,color:T.color.charcoal,fontStyle:"italic"}}>
          {userName ? t("palaceAwaits", { name: userName }) : t("palaceAwaitsDefault")}
        </h2>
        <p style={{fontFamily:T.font.body,fontSize:"1rem",color:T.color.muted,maxWidth:"23.75rem",lineHeight:1.6}}>
          {t("readyQuick")}
        </p>
        {firstWing&&<span style={{fontFamily:T.font.body,fontSize:"0.8125rem",padding:"0.375rem 0.875rem",borderRadius:"1.25rem",background:`${WINGS.find(w=>w.id===firstWing)?.accent}20`,color:WINGS.find(w=>w.id===firstWing)?.accent,border:`0.0625rem solid ${WINGS.find(w=>w.id===firstWing)?.accent}40`}}>
          {t("startingIn", { wing: tw(WINGS.find(w=>w.id===firstWing)?.nameKey || "family") })}
        </span>}
        {styleEra&&<span style={{fontFamily:T.font.body,fontSize:"0.75rem",color:T.color.muted,marginTop:"-0.5rem"}}>
          {t(styleEra === "roman" ? "styleRoman" : "styleRenaissance")}
        </span>}
      </div>
    ),
  ];

  const canNext=onboardStep===0?(userName.trim().length>0):onboardStep===1?(!!styleEra):onboardStep===2?(!!firstWing):true;
  const isLast=onboardStep===3;

  // Focus the wizard on mount for screen readers
  useEffect(() => {
    wizardRef.current?.focus();
  }, []);

  // Keyboard navigation: Enter/ArrowRight to advance, ArrowLeft to go back
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === "ArrowRight") && canNext) {
      // Don't intercept Enter when focused on the name input
      if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") return;
      if (isLast) { ensureGoal(); onFinish(); } else setOnboardStep(s => s + 1);
    } else if (e.key === "ArrowLeft" && onboardStep > 0) {
      setOnboardStep(s => s - 1);
    }
  }, [canNext, isLast, onboardStep, onFinish, ensureGoal, setOnboardStep]);

  return(
    <div ref={wizardRef} role="dialog" aria-label={t("wizardAriaLabel")} aria-modal="true" tabIndex={-1} onKeyDown={handleKeyDown}
      style={{width:"100vw",height:"100vh",background:`linear-gradient(165deg,${T.color.linen} 0%,${T.color.warmStone} 50%,${T.color.sandstone}55 100%)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"relative",overflow:isMobile?"auto":"hidden"}}>
      <div style={{position:"absolute",top:"-7.5rem",right:"-5rem",width:"23.75rem",height:"23.75rem",borderRadius:"50%",background:`radial-gradient(circle,${T.color.terracotta}08,transparent 70%)`,pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:"-6.25rem",left:"-3.75rem",width:"18.75rem",height:"18.75rem",borderRadius:"50%",background:`radial-gradient(circle,${T.color.sage}08,transparent 70%)`,pointerEvents:"none"}}/>
      {/* Progress dots */}
      <div style={{position:"absolute",top:"2rem",display:"flex",gap:"0.625rem",alignItems:"center"}} role="group" aria-label={t("progressAriaLabel")}>
        {[0,1,2,3].map(i=>(
          <div key={i} role="presentation" aria-label={t("stepIndicator", { current: String(i + 1), total: "4" })} aria-current={i===onboardStep?"step":undefined}
            style={{width:i===onboardStep?"1.75rem":"0.5rem",height:"0.5rem",borderRadius:"0.25rem",
            background:i<onboardStep?T.color.terracotta:i===onboardStep?T.color.terracotta:`${T.color.sandstone}60`,
            transition:"all .4s ease"}}/>
        ))}
      </div>
      <div key={onboardStep} style={{maxWidth:"35rem",width:"90%",padding:"2.5rem 1.25rem"}}>{steps[onboardStep]()}</div>
      <div style={{display:"flex",gap:"0.875rem",marginTop:"0.5rem"}}>
        {onboardStep>0&&<button onClick={()=>setOnboardStep(s=>s-1)}
          onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=`${T.color.sandstone}20`;(e.currentTarget as HTMLElement).style.borderColor=T.color.walnut;}}
          onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="transparent";(e.currentTarget as HTMLElement).style.borderColor=T.color.sandstone;}}
          style={{fontFamily:T.font.body,fontSize:"0.9375rem",fontWeight:500,padding:"0.75rem 1.75rem",borderRadius:"0.625rem",
            border:`0.09375rem solid ${T.color.sandstone}`,background:"transparent",color:T.color.walnut,cursor:"pointer",transition:"all .2s"}}>
          {"\u2190"} {t("backButton")}</button>}
        <button onClick={()=>{if(isLast){ensureGoal();onFinish();}else setOnboardStep(s=>s+1);}} disabled={!canNext}
          onMouseEnter={e=>{if(canNext){(e.currentTarget as HTMLElement).style.transform="scale(1.03)";(e.currentTarget as HTMLElement).style.boxShadow="0 0.375rem 1.25rem rgba(193,127,89,.45)";}}}
          onMouseLeave={e=>{if(canNext){(e.currentTarget as HTMLElement).style.transform="none";(e.currentTarget as HTMLElement).style.boxShadow="0 0.25rem 1rem rgba(193,127,89,.3)";}}}
          style={{fontFamily:T.font.body,fontSize:isMobile?"1.0625rem":"1rem",fontWeight:600,padding:isMobile?"0.9375rem 2rem":"0.8125rem 2.25rem",borderRadius:"0.625rem",minHeight:"3rem",
            border:"none",background:canNext?`linear-gradient(135deg,${T.color.terracotta},${T.color.walnut})`:`${T.color.sandstone}50`,
            color:canNext?"#FFF":T.color.muted,cursor:canNext?"pointer":"default",transition:"all .3s",
            boxShadow:canNext?"0 0.25rem 1rem rgba(193,127,89,.3)":"none"}}>
          {isLast?`\uD83C\uDFDB\uFE0F  ${t("enterPalace")}`:onboardStep===0?`${t("letsBegin")} \u2192`:`${tc("continue")} \u2192`}
        </button>
      </div>
      {onboardStep<3&&<button onClick={()=>{ensureGoal();useUserStore.getState().setStyleEra("roman");useWalkthroughStore.getState().skip();setOnboarded(true);}}
        onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color=T.color.walnut;}}
        onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color=T.color.muted;}}
        style={{position:"absolute",bottom:"1.75rem",fontFamily:T.font.body,fontSize:"0.8125rem",color:T.color.muted,background:"none",border:"none",cursor:"pointer",textDecoration:"underline",textUnderlineOffset:"0.1875rem"}}>
        {t("skipOnboarding")}</button>}
    </div>
  );
}
