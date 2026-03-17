"use client";
import { T } from "@/lib/theme";
import { useIsMobile, useIsSmall } from "@/lib/hooks/useIsMobile";
import { WINGS } from "@/lib/constants/wings";
import { HERO_IMG } from "@/lib/constants/defaults";
import { useUserStore } from "@/lib/stores/userStore";
import { useWalkthroughStore } from "@/lib/stores/walkthroughStore";
import { useTranslation } from "@/lib/hooks/useTranslation";

interface OnboardingWizardProps {
  onFinish: () => void;
}

export default function OnboardingWizard({onFinish}: OnboardingWizardProps){
  const isMobile = useIsMobile();
  const isSmall = useIsSmall();
  const { t } = useTranslation("onboarding");
  const { t: tc } = useTranslation("common");
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
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",gap:20,animation:"fadeUp .6s ease"}}>
        <h1 style={{fontFamily:T.font.display,fontSize:isMobile?32:38,fontWeight:300,color:T.color.charcoal,letterSpacing:".5px",lineHeight:1.2}}>{t("welcomeTitle")}<br/><span style={{fontWeight:600,fontStyle:"italic"}}>{t("appName")}</span></h1>
        <div style={{width:"100%",maxWidth:420,borderRadius:16,overflow:"hidden",boxShadow:"0 8px 40px rgba(44,44,42,.18)",border:`3px solid ${T.color.sandstone}44`}}>
          <img src={HERO_IMG} alt="The Memory Palace" style={{width:"100%",height:"auto",display:"block"}}/>
        </div>
        <p style={{fontFamily:T.font.body,fontSize:16,color:T.color.muted,maxWidth:400,lineHeight:1.6}}>{t("welcomeDescription")}</p>
        <div style={{width:"100%",maxWidth:340}}>
          <p style={{fontFamily:T.font.body,fontSize:14,color:T.color.sandstone,marginBottom:12}}>{t("whatToCallYou")}</p>
          <input value={userName} onChange={e=>setUserName(e.target.value)} placeholder={t("namePlaceholder")}
            style={{fontFamily:T.font.display,fontSize:22,textAlign:"center",padding:"12px 24px",border:`2px solid ${T.color.sandstone}`,borderRadius:12,background:T.color.linen,color:T.color.charcoal,outline:"none",width:"100%",transition:"border-color .2s"}}
            onFocus={e=>{e.target.style.borderColor=T.color.terracotta;}} onBlur={e=>{e.target.style.borderColor=T.color.sandstone;}}
            autoFocus onKeyDown={e=>{if(e.key==="Enter"&&userName.trim())setOnboardStep(1);}}/>
        </div>
      </div>
    ),
    // Step 1: Style choice — Roman vs Renaissance
    ()=>(
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",gap:20,animation:"fadeUp .6s ease"}}>
        <h2 style={{fontFamily:T.font.display,fontSize:isMobile?24:28,fontWeight:400,color:T.color.charcoal}}>
          {t("styleChoiceTitle")}
        </h2>
        <div style={{display:"flex",flexDirection:isMobile?"column":"row",gap:16,width:"100%",maxWidth:520}}>
          {eraOptions.map(era=>{
            const selected = styleEra === era.id;
            const borderColor = selected ? (era.id === "roman" ? T.era.roman.secondary : T.era.renaissance.accent) : T.color.cream;
            return (
              <button key={era.id} onClick={()=>setStyleEra(era.id)}
                style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:12,padding:16,borderRadius:16,
                  border:`3px solid ${borderColor}`,
                  background:selected?`${borderColor}12`:T.color.linen,cursor:"pointer",transition:"all .25s",
                  boxShadow:selected?"0 4px 20px rgba(0,0,0,.1)":"0 2px 8px rgba(0,0,0,.04)"}}>
                <div style={{width:"100%",aspectRatio:"4/3",borderRadius:12,overflow:"hidden",
                  background:era.fallbackColor,position:"relative"}}>
                  <img src={era.img} alt={t(era.id === "roman" ? "styleRoman" : "styleRenaissance")}
                    style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}
                    onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
                  {selected && <div style={{position:"absolute",top:8,right:8,width:28,height:28,borderRadius:"50%",
                    background:borderColor,display:"flex",alignItems:"center",justifyContent:"center",
                    color:"#FFF",fontSize:16,fontWeight:700}}>{"\u2713"}</div>}
                </div>
                <div style={{fontFamily:T.font.display,fontSize:isMobile?18:20,fontWeight:600,color:T.color.charcoal}}>
                  {t(era.id === "roman" ? "styleRoman" : "styleRenaissance")}
                </div>
                <div style={{fontFamily:T.font.body,fontSize:13,color:T.color.muted,lineHeight:1.4}}>
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
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",gap:18,animation:"fadeUp .6s ease"}}>
        <h2 style={{fontFamily:T.font.display,fontSize:isMobile?24:28,fontWeight:400,color:T.color.charcoal}}>
          {userName ? t("chooseFirstWingPersonal", { name: userName }) : t("chooseFirstWing")}
        </h2>
        <p style={{fontFamily:T.font.body,fontSize:15,color:T.color.muted,maxWidth:400}}>{t("wingDescriptionShort")}</p>
        <div style={{display:"flex",flexDirection:"column",gap:8,width:"100%",maxWidth:420}}>
          {WINGS.map(w=>(
            <button key={w.id} onClick={()=>setFirstWing(w.id)}
              style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",borderRadius:14,
                border:`2px solid ${firstWing===w.id?w.accent:T.color.cream}`,
                background:firstWing===w.id?`${w.accent}15`:T.color.linen,cursor:"pointer",textAlign:"left",transition:"all .2s"}}>
              <div style={{fontSize:26,width:40,textAlign:"center",flexShrink:0}}>{w.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:T.font.display,fontSize:17,fontWeight:500,color:T.color.charcoal}}>{w.name}</div>
                <div style={{fontFamily:T.font.body,fontSize:12,color:T.color.muted}}>{w.desc}</div>
              </div>
              {firstWing===w.id&&<div style={{color:w.accent,fontSize:18}}>{"\u2713"}</div>}
            </button>
          ))}
        </div>
      </div>
    ),
    // Step 3: Ready — short confirmation
    ()=>(
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",gap:20,animation:"fadeUp .6s ease"}}>
        <div style={{fontSize:56,lineHeight:1}}>{"\uD83C\uDFDB\uFE0F"}</div>
        <h2 style={{fontFamily:T.font.display,fontSize:isMobile?28:34,fontWeight:400,color:T.color.charcoal,fontStyle:"italic"}}>
          {userName ? t("palaceAwaits", { name: userName }) : t("palaceAwaitsDefault")}
        </h2>
        <p style={{fontFamily:T.font.body,fontSize:16,color:T.color.muted,maxWidth:380,lineHeight:1.6}}>
          {t("readyQuick")}
        </p>
        {firstWing&&<span style={{fontFamily:T.font.body,fontSize:13,padding:"6px 14px",borderRadius:20,background:`${WINGS.find(w=>w.id===firstWing)?.accent}20`,color:WINGS.find(w=>w.id===firstWing)?.accent,border:`1px solid ${WINGS.find(w=>w.id===firstWing)?.accent}40`}}>
          {t("startingIn", { wing: WINGS.find(w=>w.id===firstWing)?.name || "" })}
        </span>}
        {styleEra&&<span style={{fontFamily:T.font.body,fontSize:12,color:T.color.muted,marginTop:-8}}>
          {t(styleEra === "roman" ? "styleRoman" : "styleRenaissance")}
        </span>}
      </div>
    ),
  ];

  const canNext=onboardStep===0?(userName.trim().length>0):onboardStep===1?(!!styleEra):onboardStep===2?(!!firstWing):true;
  const isLast=onboardStep===3;

  return(
    <div style={{width:"100vw",height:"100vh",background:`linear-gradient(165deg,${T.color.linen} 0%,${T.color.warmStone} 50%,${T.color.sandstone}55 100%)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"relative",overflow:isMobile?"auto":"hidden"}}>
      <style>{`*{box-sizing:border-box;margin:0}`}</style>
      <div style={{position:"absolute",top:-120,right:-80,width:380,height:380,borderRadius:"50%",background:`radial-gradient(circle,${T.color.terracotta}08,transparent 70%)`,pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:-100,left:-60,width:300,height:300,borderRadius:"50%",background:`radial-gradient(circle,${T.color.sage}08,transparent 70%)`,pointerEvents:"none"}}/>
      {/* Progress dots */}
      <div style={{position:"absolute",top:32,display:"flex",gap:10,alignItems:"center"}}>
        {[0,1,2,3].map(i=>(
          <div key={i} style={{width:i===onboardStep?28:8,height:8,borderRadius:4,
            background:i<onboardStep?T.color.terracotta:i===onboardStep?T.color.terracotta:`${T.color.sandstone}60`,
            transition:"all .4s ease"}}/>
        ))}
      </div>
      <div key={onboardStep} style={{maxWidth:560,width:"90%",padding:"40px 20px"}}>{steps[onboardStep]()}</div>
      <div style={{display:"flex",gap:14,marginTop:8}}>
        {onboardStep>0&&<button onClick={()=>setOnboardStep(s=>s-1)}
          style={{fontFamily:T.font.body,fontSize:15,fontWeight:500,padding:"12px 28px",borderRadius:10,
            border:`1.5px solid ${T.color.sandstone}`,background:"transparent",color:T.color.walnut,cursor:"pointer",transition:"all .2s"}}>
          {"\u2190"} {t("backButton")}</button>}
        <button onClick={()=>{if(isLast){ensureGoal();onFinish();}else setOnboardStep(s=>s+1);}} disabled={!canNext}
          style={{fontFamily:T.font.body,fontSize:isMobile?17:16,fontWeight:600,padding:isMobile?"15px 32px":"13px 36px",borderRadius:10,minHeight:48,
            border:"none",background:canNext?`linear-gradient(135deg,${T.color.terracotta},${T.color.walnut})`:`${T.color.sandstone}50`,
            color:canNext?"#FFF":T.color.muted,cursor:canNext?"pointer":"default",transition:"all .3s",
            boxShadow:canNext?"0 4px 16px rgba(193,127,89,.3)":"none"}}>
          {isLast?`\uD83C\uDFDB\uFE0F  ${t("enterPalace")}`:onboardStep===0?`${t("letsBegin")} \u2192`:`${tc("continue")} \u2192`}
        </button>
      </div>
      {onboardStep<3&&<button onClick={()=>{ensureGoal();useUserStore.getState().setStyleEra("roman");useWalkthroughStore.getState().skip();setOnboarded(true);}}
        style={{position:"absolute",bottom:28,fontFamily:T.font.body,fontSize:13,color:T.color.muted,background:"none",border:"none",cursor:"pointer",textDecoration:"underline",textUnderlineOffset:3}}>
        {t("skipOnboarding")}</button>}
    </div>
  );
}
