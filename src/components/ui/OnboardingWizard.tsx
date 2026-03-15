"use client";
import { T } from "@/lib/theme";
import { useIsMobile, useIsSmall } from "@/lib/hooks/useIsMobile";
import { WINGS } from "@/lib/constants/wings";
import { HERO_IMG } from "@/lib/constants/defaults";
import { useUserStore } from "@/lib/stores/userStore";
import { TRACKS, GOAL_TRACK_PRIORITY } from "@/lib/constants/tracks";

const GOALS=[
  {id:"preserve",icon:"\u{1F4DC}",label:"Preserve my memories",desc:"Keep a lifetime of moments safe and beautiful"},
  {id:"legacy",icon:"\u{1F3DB}\uFE0F",label:"Build a legacy",desc:"Create something lasting for my children and grandchildren"},
  {id:"share",icon:"\u{1F91D}",label:"Share with family",desc:"Bring loved ones together around shared memories"},
  {id:"organize",icon:"\u2728",label:"Organize my life story",desc:"Finally put all those photos, videos, and stories in order"},
];

interface OnboardingWizardProps {
  onFinish: () => void;
}

export default function OnboardingWizard({onFinish}: OnboardingWizardProps){
  const isMobile = useIsMobile();
  const isSmall = useIsSmall();
  const { onboardStep, userName, userGoal, firstWing,
    setOnboardStep, setUserName, setUserGoal, setFirstWing, setOnboarded } = useUserStore();

  const steps=[
    // Step 0: Welcome
    ()=>(
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",gap:22,animation:"fadeUp .6s ease"}}>
        <h1 style={{fontFamily:T.font.display,fontSize:38,fontWeight:300,color:T.color.charcoal,letterSpacing:".5px",lineHeight:1.2}}>Welcome to<br/><span style={{fontWeight:600,fontStyle:"italic"}}>The Memory Palace</span></h1>
        <div style={{width:"100%",maxWidth:480,borderRadius:16,overflow:"hidden",boxShadow:"0 8px 40px rgba(44,44,42,.18)",border:`3px solid ${T.color.sandstone}44`}}>
          <img src={HERO_IMG} alt="The Memory Palace" style={{width:"100%",height:"auto",display:"block"}}/>
        </div>
        <p style={{fontFamily:T.font.body,fontSize:17,color:T.color.muted,maxWidth:440,lineHeight:1.7}}>A beautiful place to preserve your most precious memories — photos, videos, stories — in a space as unique as your life.</p>
        <p style={{fontFamily:T.font.body,fontSize:15,color:T.color.sandstone}}>Let&#39;s set up your palace in just a few steps.</p>
      </div>
    ),
    // Step 1: Your name
    ()=>(
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",gap:24,animation:"fadeUp .6s ease"}}>
        <div style={{fontSize:36,lineHeight:1}}>{"\u{1F44B}"}</div>
        <h2 style={{fontFamily:T.font.display,fontSize:30,fontWeight:400,color:T.color.charcoal}}>What should we call you?</h2>
        <p style={{fontFamily:T.font.body,fontSize:16,color:T.color.muted,maxWidth:380}}>This is your personal palace — we&#39;d love to greet you by name.</p>
        <input value={userName} onChange={e=>setUserName(e.target.value)} placeholder="Your first name"
          style={{fontFamily:T.font.display,fontSize:24,textAlign:"center",padding:"14px 28px",border:`2px solid ${T.color.sandstone}`,borderRadius:12,background:T.color.linen,color:T.color.charcoal,outline:"none",width:320,transition:"border-color .2s"}}
          onFocus={e=>{e.target.style.borderColor=T.color.terracotta;}} onBlur={e=>{e.target.style.borderColor=T.color.sandstone;}}
          autoFocus onKeyDown={e=>{if(e.key==="Enter"&&userName.trim())setOnboardStep(2);}}/>
      </div>
    ),
    // Step 2: Goal
    ()=>(
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",gap:24,animation:"fadeUp .6s ease"}}>
        <h2 style={{fontFamily:T.font.display,fontSize:28,fontWeight:400,color:T.color.charcoal}}>
          {userName?`${userName}, what`:"What"} brings you here?
        </h2>
        <p style={{fontFamily:T.font.body,fontSize:15,color:T.color.muted}}>Choose what matters most to you right now.</p>
        <div style={{display:"grid",gridTemplateColumns:isSmall?"1fr":"1fr 1fr",gap:isMobile?10:14,maxWidth:500,width:"100%"}}>
          {GOALS.map(g=>(
            <button key={g.id} onClick={()=>setUserGoal(g.id)}
              style={{padding:"18px 16px",borderRadius:14,border:`2px solid ${userGoal===g.id?T.color.terracotta:T.color.cream}`,
                background:userGoal===g.id?`${T.color.terracotta}12`:T.color.linen,cursor:"pointer",textAlign:"left",transition:"all .2s",
                transform:userGoal===g.id?"scale(1.02)":"scale(1)"}}>
              <div style={{fontSize:24,marginBottom:6}}>{g.icon}</div>
              <div style={{fontFamily:T.font.display,fontSize:17,fontWeight:500,color:T.color.charcoal}}>{g.label}</div>
              <div style={{fontFamily:T.font.body,fontSize:13,color:T.color.muted,marginTop:4,lineHeight:1.4}}>{g.desc}</div>
            </button>
          ))}
        </div>
      </div>
    ),
    // Step 3: Pick your first wing
    ()=>(
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",gap:20,animation:"fadeUp .6s ease"}}>
        <h2 style={{fontFamily:T.font.display,fontSize:28,fontWeight:400,color:T.color.charcoal}}>Choose your first wing to explore</h2>
        <p style={{fontFamily:T.font.body,fontSize:15,color:T.color.muted,maxWidth:420}}>Your palace has five wings, each for a different chapter of your life. Which one calls to you first?</p>
        <div style={{display:"flex",flexDirection:"column",gap:10,width:"100%",maxWidth:440}}>
          {WINGS.map(w=>(
            <button key={w.id} onClick={()=>setFirstWing(w.id)}
              style={{display:"flex",alignItems:"center",gap:16,padding:"16px 20px",borderRadius:14,
                border:`2px solid ${firstWing===w.id?w.accent:T.color.cream}`,
                background:firstWing===w.id?`${w.accent}15`:T.color.linen,cursor:"pointer",textAlign:"left",transition:"all .2s"}}>
              <div style={{fontSize:28,width:44,textAlign:"center",flexShrink:0}}>{w.icon}</div>
              <div>
                <div style={{fontFamily:T.font.display,fontSize:19,fontWeight:500,color:T.color.charcoal}}>{w.name}</div>
                <div style={{fontFamily:T.font.body,fontSize:13,color:T.color.muted}}>{w.desc}</div>
              </div>
              {firstWing===w.id&&<div style={{marginLeft:"auto",color:w.accent,fontSize:20}}>{"\u2713"}</div>}
            </button>
          ))}
        </div>
      </div>
    ),
    // Step 4: Ready
    ()=>(
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",gap:20,animation:"fadeUp .6s ease"}}>
        <h2 style={{fontFamily:T.font.display,fontSize:34,fontWeight:400,color:T.color.charcoal,fontStyle:"italic"}}>
          {userName?`${userName}\u2019s`:"Your"} Memory Palace awaits
        </h2>
        <div style={{width:"100%",maxWidth:420,borderRadius:14,overflow:"hidden",boxShadow:"0 12px 48px rgba(44,44,42,.22)",border:`3px solid ${T.color.terracotta}55`,position:"relative"}}>
          <img src={HERO_IMG} alt="Your Memory Palace" style={{width:"100%",height:"auto",display:"block"}}/>
          <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,transparent 50%,rgba(44,44,42,.5) 100%)"}}/>
          <div style={{position:"absolute",bottom:14,left:0,right:0,textAlign:"center"}}>
            <span style={{fontFamily:T.font.display,fontSize:18,fontWeight:500,color:"#FFF",textShadow:"0 2px 8px rgba(0,0,0,.5)",fontStyle:"italic"}}>
              {userName?`${userName}\u2019s Palace`:"Your Palace"} is ready
            </span>
          </div>
        </div>
        <p style={{fontFamily:T.font.body,fontSize:16,color:T.color.muted,maxWidth:440,lineHeight:1.7}}>
          Walk through the corridors, open rooms, and begin filling them with the moments that matter most.
        </p>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center",marginTop:4}}>
          {firstWing&&<span style={{fontFamily:T.font.body,fontSize:13,padding:"6px 14px",borderRadius:20,background:`${WINGS.find(w=>w.id===firstWing)?.accent}20`,color:WINGS.find(w=>w.id===firstWing)?.accent,border:`1px solid ${WINGS.find(w=>w.id===firstWing)?.accent}40`}}>
            Starting in: {WINGS.find(w=>w.id===firstWing)?.name} Wing
          </span>}
          {userGoal&&<span style={{fontFamily:T.font.body,fontSize:13,padding:"6px 14px",borderRadius:20,background:`${T.color.terracotta}15`,color:T.color.terracotta,border:`1px solid ${T.color.terracotta}40`}}>
            {GOALS.find(g=>g.id===userGoal)?.label}
          </span>}
        </div>
        {userGoal&&(()=>{
          const priority=GOAL_TRACK_PRIORITY[userGoal]||GOAL_TRACK_PRIORITY["preserve"];
          const recTrack=TRACKS.find(t=>t.id===priority[0]);
          if(!recTrack) return null;
          return <div style={{marginTop:8,padding:"12px 18px",borderRadius:12,background:`${recTrack.color}08`,border:`1px solid ${recTrack.color}20`,maxWidth:440,width:"100%"}}>
            <div style={{fontFamily:T.font.body,fontSize:10,fontWeight:600,color:recTrack.color,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Recommended Track</div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:20}}>{recTrack.icon}</span>
              <div style={{textAlign:"left"}}>
                <div style={{fontFamily:T.font.display,fontSize:15,fontWeight:600,color:T.color.charcoal}}>{recTrack.name}</div>
                <div style={{fontFamily:T.font.body,fontSize:12,color:T.color.muted,lineHeight:1.4}}>{recTrack.description}</div>
              </div>
            </div>
          </div>;
        })()}
      </div>
    ),
  ];

  const canNext=onboardStep===0||(onboardStep===1&&userName.trim().length>0)||(onboardStep===2&&!!userGoal)||(onboardStep===3&&!!firstWing)||onboardStep===4;
  const isLast=onboardStep===4;

  return(
    <div style={{width:"100vw",height:"100vh",background:`linear-gradient(165deg,${T.color.linen} 0%,${T.color.warmStone} 50%,${T.color.sandstone}55 100%)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"relative",overflow:isMobile?"auto":"hidden"}}>
      <style>{`*{box-sizing:border-box;margin:0}`}</style>
      <div style={{position:"absolute",top:-120,right:-80,width:380,height:380,borderRadius:"50%",background:`radial-gradient(circle,${T.color.terracotta}08,transparent 70%)`,pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:-100,left:-60,width:300,height:300,borderRadius:"50%",background:`radial-gradient(circle,${T.color.sage}08,transparent 70%)`,pointerEvents:"none"}}/>
      {/* Progress dots */}
      <div style={{position:"absolute",top:32,display:"flex",gap:10,alignItems:"center"}}>
        {[0,1,2,3,4].map(i=>(
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
          ← Back</button>}
        <button onClick={()=>{if(isLast)onFinish();else setOnboardStep(s=>s+1);}} disabled={!canNext}
          style={{fontFamily:T.font.body,fontSize:isMobile?17:16,fontWeight:600,padding:isMobile?"15px 32px":"13px 36px",borderRadius:10,minHeight:48,
            border:"none",background:canNext?`linear-gradient(135deg,${T.color.terracotta},${T.color.walnut})`:`${T.color.sandstone}50`,
            color:canNext?"#FFF":T.color.muted,cursor:canNext?"pointer":"default",transition:"all .3s",
            boxShadow:canNext?"0 4px 16px rgba(193,127,89,.3)":"none"}}>
          {isLast?"\u{1F3DB}\uFE0F  Enter Your Palace":onboardStep===0?"Let\u2019s Begin \u2192":"Continue \u2192"}
        </button>
      </div>
      {onboardStep<4&&<button onClick={()=>setOnboarded(true)}
        style={{position:"absolute",bottom:28,fontFamily:T.font.body,fontSize:13,color:T.color.muted,background:"none",border:"none",cursor:"pointer",textDecoration:"underline",textUnderlineOffset:3}}>
        Skip and explore on my own</button>}
    </div>
  );
}
