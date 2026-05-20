"use client";
import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";

const POST_TYPES = [
  { id: "feed", label: "フィード", color: "#0EA5E9", lightBg: "#EFF9FF", icon: "⊞" },
  { id: "reel", label: "リール",   color: "#F43F5E", lightBg: "#FFF1F2", icon: "▶" },
];

const EXTRA_COLORS = [
  { color: "#8B5CF6", lightBg: "#F5F3FF", icon: "◆" },
  { color: "#F59E0B", lightBg: "#FFFBEB", icon: "★" },
  { color: "#10B981", lightBg: "#ECFDF5", icon: "●" },
  { color: "#EC4899", lightBg: "#FDF2F8", icon: "♥" },
  { color: "#6366F1", lightBg: "#EEF2FF", icon: "▲" },
];

const PLANS = [
  { id: "standard", label: "スタンダード", desc: "フィード12本 / リール4本",  defaults: { feed: 12, reel: 4  } },
  { id: "advance",  label: "アドバンス",   desc: "フィード12本 / リール12本", defaults: { feed: 12, reel: 12 } },
  { id: "custom",   label: "カスタム",     desc: "本数を自由に設定",          defaults: { feed: 8,  reel: 8  } },
];

const JP_HOLIDAYS = {
  "2025-01-01":"元日","2025-01-13":"成人の日","2025-02-11":"建国記念日",
  "2025-02-23":"天皇誕生日","2025-02-24":"天皇誕生日 振替","2025-03-20":"春分の日",
  "2025-04-29":"昭和の日","2025-05-03":"憲法記念日","2025-05-04":"みどりの日",
  "2025-05-05":"こどもの日","2025-05-06":"みどりの日 振替","2025-07-21":"海の日",
  "2025-08-11":"山の日","2025-09-15":"敬老の日","2025-09-23":"秋分の日",
  "2025-10-13":"スポーツの日","2025-11-03":"文化の日","2025-11-23":"勤労感謝の日","2025-11-24":"勤労感謝の日 振替",
  "2026-01-01":"元日","2026-01-12":"成人の日","2026-02-11":"建国記念日",
  "2026-02-23":"天皇誕生日","2026-03-20":"春分の日","2026-04-29":"昭和の日",
  "2026-05-03":"憲法記念日","2026-05-04":"みどりの日","2026-05-05":"こどもの日",
  "2026-05-06":"憲法記念日 振替","2026-07-20":"海の日","2026-08-11":"山の日",
  "2026-09-21":"敬老の日","2026-09-22":"国民の休日","2026-09-23":"秋分の日",
  "2026-10-12":"スポーツの日","2026-11-03":"文化の日","2026-11-23":"勤労感謝の日",
  "2027-01-01":"元日","2027-01-11":"成人の日","2027-02-11":"建国記念日",
  "2027-02-23":"天皇誕生日","2027-03-21":"春分の日","2027-03-22":"春分の日 振替",
  "2027-04-29":"昭和の日","2027-05-03":"憲法記念日","2027-05-04":"みどりの日",
  "2027-05-05":"こどもの日","2027-07-19":"海の日","2027-08-11":"山の日",
  "2027-09-20":"敬老の日","2027-09-23":"秋分の日","2027-10-11":"スポーツの日",
  "2027-11-03":"文化の日","2027-11-23":"勤労感謝の日",
};

const DAYS_JA     = ["日","月","火","水","木","金","土"];
const MONTHS_JA   = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
const CIRCLE_NUMS = ["①","②","③","④","⑤","⑥","⑦","⑧","⑨","⑩","⑪","⑫","⑬","⑭","⑮","⑯","⑰","⑱","⑲","⑳"];
const PRESET_KEY  = "sns-cal-presets-v3";
const TUT_KEY     = "sns-cal-tut-v3";

const STEPS = [
  { num:"1", title:"クライアント名・プランを選ぶ", desc:"会社名を入力して、プランを選ぶと本数が自動でセットされます。" },
  { num:"2", title:"投稿種別をカスタマイズ",       desc:"フィード・リール以外にも「＋」ボタンから種別を自由に追加できます。追加した種別は「×」ボタンで削除できます。" },
  { num:"3", title:"投稿する曜日を選ぶ",           desc:"各種別カードで投稿したい曜日を選んでください。選んだ瞬間にカレンダーへ反映されます。" },
  { num:"4", title:"カレンダーを確認・調整する",   desc:"祝日は自動で平日に振替されます。バッジをドラッグして好きな日に移動もできます。日付をクリックすると休日に設定できます。" },
  { num:"5", title:"保存してダウンロード",         desc:"「保存」で設定を記憶。次回は名前を選ぶだけ。最後にPNG画像としてダウンロードできます。" },
];

const getDaysInMonth = (y,m) => new Date(y,m+1,0).getDate();
const getFirstDay    = (y,m) => new Date(y,m,1).getDay();
const toKey          = (y,m,d) => `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
const getDow         = (y,m,d) => new Date(y,m,d).getDay();
const isWD           = (y,m,d) => { const w=getDow(y,m,d); return w!==0&&w!==6; };

function findShift(orig, dow, y, m, holidays, used, tid) {
  const total = getDaysInMonth(y,m);
  const ok = d => d>=1&&d<=total&&!holidays.has(toKey(y,m,d))&&isWD(y,m,d)&&!(used[d]&&used[d][tid]);
  for(let d=total;d>=1;d--){ if(d!==orig&&getDow(y,m,d)===dow&&ok(d)) return{day:d,isShifted:true}; }
  for(let d=orig+1;d<=total;d++) if(ok(d)) return{day:d,isShifted:true};
  for(let d=orig-1;d>=1;d--)    if(ok(d)) return{day:d,isShifted:true};
  for(let d=1;d<=total;d++)      if(isWD(y,m,d)&&!holidays.has(toKey(y,m,d))) return{day:d,isShifted:true};
  return{day:total,isShifted:true};
}

function buildPosts(y, m, ws, counts, holidays, allPostTypes) {
  const total=getDaysInMonth(y,m), used={};
  const mark=(d,t)=>{ if(!used[d])used[d]={}; used[d][t]=true; };
  const normal=[], nc=Object.fromEntries(allPostTypes.map(p=>[p.id,0]));
  for(let d=1;d<=total;d++){
    const dow=getDow(y,m,d);
    allPostTypes.forEach(pt=>{
      if(!ws[dow].has(pt.id)||nc[pt.id]>=(counts[pt.id]??0)) return;
      if(holidays.has(toKey(y,m,d))||used[d]?.[pt.id]) return;
      normal.push({id:pt.id+d+Math.random(),typeId:pt.id,day:d,isShifted:false});
      mark(d,pt.id); nc[pt.id]++;
    });
  }
  const shifted=[];
  for(let d=1;d<=total;d++){
    const dow=getDow(y,m,d);
    if(!holidays.has(toKey(y,m,d))) continue;
    allPostTypes.forEach(pt=>{
      if(!ws[dow].has(pt.id)) return;
      const so=nc[pt.id]+shifted.filter(p=>p.typeId===pt.id).length;
      if(so>=(counts[pt.id]??0)) return;
      const s=findShift(d,dow,y,m,holidays,used,pt.id);
      if(s){ shifted.push({id:pt.id+'s'+s.day+Math.random(),typeId:pt.id,day:s.day,isShifted:true}); mark(s.day,pt.id); }
    });
  }
  return [...normal,...shifted];
}

const loadPresets = () => { try{ const r=localStorage.getItem(PRESET_KEY); return r?JSON.parse(r):[]; }catch{ return []; } };
const savePresets = p  => { try{ localStorage.setItem(PRESET_KEY,JSON.stringify(p)); }catch{} };

// ─── メインコンポーネント ───
export default function App() {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [company,  setCompany]  = useState("");
  const [planId,   setPlanId]   = useState("standard");
  const [counts,   setCounts]   = useState({feed:12,reel:4});
  const [ws, setWs] = useState(()=>Object.fromEntries([0,1,2,3,4,5,6].map(d=>[d,new Set()])));
  const [manualH,  setManualH]  = useState(new Set());
  const [posts,    setPosts]    = useState([]);
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [dl,       setDl]       = useState(false);
  const [presets,  setPresets]  = useState([]);
  const [toast,    setToast]    = useState(null);
  const [tutStep,      setTutStep]      = useState(-1);
  const [extraTypes,   setExtraTypes]   = useState([]);
  const [newTypeName,  setNewTypeName]  = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const calRef = useRef(null);

  const allPostTypes = useMemo(()=>[...POST_TYPES,...extraTypes],[extraTypes]);

  useEffect(()=>{
    setPresets(loadPresets());
    try{ if(!localStorage.getItem(TUT_KEY)) setTutStep(0); }catch{}
  },[]);

  const allH = useMemo(()=>new Set([...Object.keys(JP_HOLIDAYS),...manualH]),[manualH]);

  useEffect(()=>{
    setPosts(buildPosts(year,month,ws,counts,allH,allPostTypes));
  },[year,month,ws,counts,allH,allPostTypes]);

  const goMonth = d => {
    let nm=month+d, ny=year;
    if(nm>11){nm=0;ny++;} if(nm<0){nm=11;ny--;}
    setMonth(nm); setYear(ny);
  };

  const toast$ = (msg,color="#16a34a") => { setToast({msg,color}); setTimeout(()=>setToast(null),2200); };
  const closeTut = () => { setTutStep(-1); try{localStorage.setItem(TUT_KEY,"1")}catch{} };

  const selectPlan = pid => { setPlanId(pid); setCounts({...PLANS.find(p=>p.id===pid).defaults}); };
  const changeCount= (tid,d) => setCounts(p=>({...p,[tid]:Math.max(0,(p[tid]??0)+d)}));
  const toggleType = (dow,tid) => {
    setWs(prev=>{ const s=new Set(prev[dow]); s.has(tid)?s.delete(tid):s.add(tid); return{...prev,[dow]:s}; });
  };
  const toggleH = day => {
    const k=toKey(year,month,day);
    if(JP_HOLIDAYS[k]) return;
    setManualH(prev=>{ const n=new Set(prev); n.has(k)?n.delete(k):n.add(k); return n; });
  };

  const onDragStart = (e,id) => { setDragging(id); e.dataTransfer.effectAllowed="move"; };
  const onDragEnd   = ()      => { setDragging(null); setDragOver(null); };
  const onDragOver  = (e,day) => { e.preventDefault(); e.dataTransfer.dropEffect="move"; };
  const onDrop      = (e,day) => {
    e.preventDefault();
    if(!dragging) return;
    setPosts(prev=>prev.map(p=>p.id===dragging?{...p,day}:p));
    setDragging(null); setDragOver(null);
  };

  const dayMap = useMemo(()=>{
    const map={};
    const c=Object.fromEntries(allPostTypes.map(p=>[p.id,0]));
    [...posts].sort((a,b)=>a.day-b.day).forEach(post=>{
      c[post.typeId]++;
      if(!map[post.day]) map[post.day]=[];
      map[post.day].push({post,index:c[post.typeId]});
    });
    return map;
  },[posts,allPostTypes]);

  const cells = useMemo(()=>{
    const a=[];
    for(let i=0;i<getFirstDay(year,month);i++) a.push(null);
    for(let d=1;d<=getDaysInMonth(year,month);d++) a.push(d);
    return a;
  },[year,month]);

  const savePreset = () => {
    if(!company.trim()){ toast$("クライアント名を入力してください","#dc2626"); return; }
    const p={id:Date.now(),company:company.trim(),planId,counts:{...counts},
      ws:Object.fromEntries(Object.entries(ws).map(([k,v])=>[k,[...v]]))};
    const next=[p,...presets.filter(x=>x.company!==p.company)].slice(0,20);
    setPresets(next); savePresets(next);
    toast$(`「${p.company}」を保存しました`);
  };

  const applyPreset = p => {
    setCompany(p.company); setPlanId(p.planId); setCounts(p.counts);
    setWs(Object.fromEntries(Object.entries(p.ws).map(([k,v])=>[k,new Set(v)])));
    toast$(`「${p.company}」を読み込みました`,"#0ea5e9");
  };

  const deletePreset = id => {
    const next=presets.filter(p=>p.id!==id); setPresets(next); savePresets(next);
    toast$("削除しました","#94a3b8");
  };

  const download = useCallback(async()=>{
    setDl(true);
    try{
      if(!window.html2canvas){
        await new Promise((res,rej)=>{
          const s=document.createElement("script");
          s.src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
          s.onload=res; s.onerror=rej; document.head.appendChild(s);
        });
      }
      const canvas=await window.html2canvas(calRef.current,{scale:2,backgroundColor:"#ffffff",useCORS:true});
      const a=document.createElement("a");
      a.download=`${company||"カレンダー"}_${year}${String(month+1).padStart(2,"0")}.png`;
      a.href=canvas.toDataURL("image/png"); a.click();
    }finally{ setDl(false); }
  },[company,year,month]);

  const addExtraType = () => {
    const name = newTypeName.trim();
    if(!name) return;
    const idx = extraTypes.length % EXTRA_COLORS.length;
    const { color, lightBg, icon } = EXTRA_COLORS[idx];
    const id = "extra_" + Date.now();
    setExtraTypes(prev=>[...prev, { id, label:name, color, lightBg, icon }]);
    setCounts(prev=>({...prev, [id]:4}));
    setNewTypeName("");
    setShowAddModal(false);
  };

  const deleteExtraType = id => {
    setExtraTypes(prev=>prev.filter(t=>t.id!==id));
    setCounts(prev=>{ const n={...prev}; delete n[id]; return n; });
    setWs(prev=>Object.fromEntries(Object.entries(prev).map(([dow,s])=>{
      const ns=new Set(s); ns.delete(id); return [dow,ns];
    })));
    setPosts(prev=>prev.filter(p=>p.typeId!==id));
  };

  const hasSetup = Object.values(ws).some(s=>s.size>0);

  return (
    <div style={{minHeight:"100vh",background:"#EAECF0",fontFamily:"'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif"}}>

      {/* ── トースト ── */}
      {toast&&(
        <div style={{
          position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",
          padding:"10px 20px",borderRadius:10,
          background:toast.color,color:"#fff",
          fontSize:13,fontWeight:600,
          boxShadow:"0 4px 20px rgba(0,0,0,.15)",
          zIndex:9999,whiteSpace:"nowrap",
        }}>{toast.msg}</div>
      )}

      {/* ── 種別追加モーダル ── */}
      {showAddModal&&(
        <div onClick={()=>setShowAddModal(false)} style={{
          position:"fixed",inset:0,zIndex:2000,
          background:"rgba(0,0,0,.4)",
          display:"flex",alignItems:"center",justifyContent:"center",padding:20,
        }}>
          <div onClick={e=>e.stopPropagation()} style={{
            width:320,background:"#fff",borderRadius:16,padding:"24px 20px",
            boxShadow:"0 20px 60px rgba(0,0,0,.2)",
          }}>
            <div style={{fontSize:15,fontWeight:700,color:"#111",marginBottom:16}}>投稿種別を追加</div>
            <input
              autoFocus
              value={newTypeName}
              onChange={e=>setNewTypeName(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter") e.preventDefault(); }}
              placeholder="例: ストーリーズ"
              style={{
                width:"100%",padding:"10px 12px",borderRadius:9,
                border:"1px solid #E5E7EB",fontSize:14,outline:"none",
                boxSizing:"border-box",marginBottom:16,
              }}
            />
            <div style={{display:"flex",gap:8}}>
              <button type="button" onClick={()=>setShowAddModal(false)} style={{
                flex:1,padding:"10px",borderRadius:9,
                border:"1px solid #E5E7EB",background:"#fff",
                color:"#9CA3AF",fontSize:13,cursor:"pointer",
              }}>キャンセル</button>
              <button type="button" onClick={addExtraType} style={{
                flex:1,padding:"10px",borderRadius:9,border:"none",
                background:"#111",color:"#fff",
                fontSize:13,fontWeight:700,cursor:"pointer",
              }}>追加</button>
            </div>
          </div>
        </div>
      )}

      {/* ── チュートリアル ── */}
      {tutStep>=0&&(
        <div onClick={closeTut} style={{
          position:"fixed",inset:0,zIndex:1000,
          background:"rgba(0,0,0,.5)",
          display:"flex",alignItems:"center",justifyContent:"center",padding:20,
        }}>
          <div onClick={e=>e.stopPropagation()} style={{
            maxWidth:400,width:"100%",
            background:"#fff",borderRadius:20,padding:"32px 28px",
            boxShadow:"0 20px 60px rgba(0,0,0,.2)",
          }}>
            {/* ステップ dots */}
            <div style={{display:"flex",gap:6,marginBottom:24,justifyContent:"center"}}>
              {STEPS.map((_,i)=>(
                <div key={i} style={{
                  width:i===tutStep?24:8,height:8,borderRadius:4,
                  background:i===tutStep?"#0EA5E9":i<tutStep?"#BAE6FD":"#E5E7EB",
                  transition:"all .25s",
                }}/>
              ))}
            </div>

            <div style={{
              display:"inline-flex",alignItems:"center",justifyContent:"center",
              width:36,height:36,borderRadius:10,
              background:"#EFF9FF",
              color:"#0EA5E9",fontSize:16,fontWeight:900,
              marginBottom:14,
            }}>{STEPS[tutStep].num}</div>

            <div style={{fontSize:17,fontWeight:700,color:"#111",marginBottom:10,lineHeight:1.4}}>
              {STEPS[tutStep].title}
            </div>
            <div style={{fontSize:13,color:"#6B7280",lineHeight:1.8,marginBottom:28}}>
              {STEPS[tutStep].desc}
            </div>

            <div style={{display:"flex",gap:8}}>
              <button onClick={closeTut} style={{
                padding:"9px 16px",borderRadius:9,
                border:"1px solid #E5E7EB",background:"#fff",
                color:"#9CA3AF",fontSize:12,cursor:"pointer",
              }}>スキップ</button>
              {tutStep>0&&(
                <button onClick={()=>setTutStep(s=>s-1)} style={{
                  padding:"9px 14px",borderRadius:9,
                  border:"1px solid #E5E7EB",background:"#F9FAFB",
                  color:"#6B7280",fontSize:12,cursor:"pointer",
                }}>← 戻る</button>
              )}
              <button onClick={()=>tutStep<STEPS.length-1?setTutStep(s=>s+1):closeTut()} style={{
                flex:1,padding:"10px",borderRadius:9,border:"none",
                background:"#0EA5E9",color:"#fff",
                fontSize:13,fontWeight:700,cursor:"pointer",
              }}>
                {tutStep<STEPS.length-1?"次へ →":"始める 🎉"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ヘッダー ── */}
      <div style={{
        background:"#fff",
        borderBottom:"1px solid #E5E7EB",
        padding:"0 32px",
        display:"flex",alignItems:"center",justifyContent:"space-between",
        height:56,
      }}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{
            width:28,height:28,borderRadius:8,
            background:"#0EA5E9",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:14,
          }}>📅</div>
          <span style={{fontSize:15,fontWeight:700,color:"#111"}}>SNS投稿カレンダー</span>
        </div>
        <button onClick={()=>setTutStep(0)} style={{
          padding:"6px 14px",borderRadius:8,
          border:"1px solid #E5E7EB",background:"#fff",
          color:"#6B7280",fontSize:12,cursor:"pointer",
        }}>使い方</button>
      </div>

      <div style={{maxWidth:1000,margin:"0 auto",padding:"24px 20px 80px"}}>

        {/* ── 保存済みクライアント ── */}
        {presets.length>0&&(
          <div style={{
            background:"#fff",borderRadius:14,border:"1px solid #E5E7EB",
            padding:"16px 20px",marginBottom:16,
          }}>
            <div style={{fontSize:12,fontWeight:600,color:"#6B7280",marginBottom:10}}>
              📂 保存済みクライアント
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {presets.map(p=>(
                <div key={p.id} style={{display:"flex",alignItems:"center",gap:0}}>
                  <button onClick={()=>applyPreset(p)} style={{
                    padding:"6px 12px",
                    borderRadius:"8px 0 0 8px",
                    border:"1px solid #E5E7EB",
                    borderRight:"none",
                    background:company===p.company?"#EFF9FF":"#F9FAFB",
                    color:company===p.company?"#0EA5E9":"#374151",
                    fontSize:12,fontWeight:company===p.company?700:400,
                    cursor:"pointer",
                  }}>{p.company}</button>
                  <button onClick={()=>deletePreset(p.id)} style={{
                    padding:"6px 8px",
                    borderRadius:"0 8px 8px 0",
                    border:"1px solid #E5E7EB",
                    background:"#F9FAFB",
                    color:"#D1D5DB",fontSize:11,cursor:"pointer",
                  }}>×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 設定カード ── */}
        <div style={{
          background:"#fff",borderRadius:14,border:"1px solid #E5E7EB",
          marginBottom:16,overflow:"hidden",
        }}>
          {/* ヘッダー */}
          <div style={{
            width:"100%",padding:"16px 20px",
            display:"flex",alignItems:"center",
            borderBottom:"1px solid #F3F4F6",
          }}>
            <span style={{fontSize:14,fontWeight:700,color:"#111"}}>
              ⚙️ 設定
              {company&&<span style={{fontWeight:400,color:"#9CA3AF",fontSize:13}}> · {company}</span>}
            </span>
          </div>

          <div style={{padding:"20px"}}>

              {/* クライアント名 */}
              <div style={{marginBottom:20}}>
                <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:6}}>
                  クライアント名
                </label>
                <input
                  value={company} onChange={e=>setCompany(e.target.value)}
                  placeholder="例: 〇〇株式会社"
                  style={{
                    width:"100%",padding:"10px 14px",borderRadius:9,
                    border:"1px solid #E5E7EB",
                    fontSize:14,color:"#111",outline:"none",
                    background:"#FAFAFA",boxSizing:"border-box",
                  }}
                  onFocus={e=>{e.target.style.borderColor="#0EA5E9";e.target.style.background="#fff";}}
                  onBlur={e=>{e.target.style.borderColor="#E5E7EB";e.target.style.background="#FAFAFA";}}
                />
              </div>

              {/* プラン */}
              <div style={{marginBottom:20}}>
                <div style={{display:"flex",gap:8}}>
                  {PLANS.map(pl=>{
                    const active=planId===pl.id;
                    return(
                      <button key={pl.id} onClick={()=>selectPlan(pl.id)} style={{
                        flex:1,padding:"10px 8px",borderRadius:10,cursor:"pointer",
                        border:`2px solid ${active?"#0EA5E9":"#E5E7EB"}`,
                        background:active?"#EFF9FF":"#fff",
                        transition:"all .15s",textAlign:"center",
                      }}>
                        <div style={{fontSize:13,fontWeight:700,color:active?"#0EA5E9":"#374151"}}>{pl.label}</div>
                        <div style={{fontSize:10,color:active?"#7DD3FC":"#9CA3AF",marginTop:2}}>{pl.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 本数 + 曜日 */}
              <div style={{marginBottom:20,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,alignItems:"start"}}>
                {allPostTypes.map(pt=>{
                  const isExtra = !POST_TYPES.find(p=>p.id===pt.id);
                  const actual=posts.filter(p=>p.typeId===pt.id).length;
                  const target=counts[pt.id]??0;
                  const ok=actual===target;
                  return(
                    <div key={pt.id} style={{
                      padding:"14px",borderRadius:12,
                      border:`1px solid ${pt.color}30`,
                      background:pt.lightBg,
                      position:"relative",
                    }}>
                      {/* カードヘッダー */}
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12}}>
                        <span style={{
                          width:24,height:24,borderRadius:6,
                          background:pt.color,color:"#fff",
                          display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,
                        }}>{pt.icon}</span>
                        <span style={{fontSize:13,fontWeight:700,color:"#111"}}>{pt.label}</span>
                        <span style={{
                          marginLeft:"auto",fontSize:11,fontWeight:600,
                          color:ok?"#16a34a":actual<target?"#d97706":"#dc2626",
                        }}>{ok?`✓ ${actual}本`:`${actual}/${target}本`}</span>
                        {isExtra&&(
                          <button onClick={()=>deleteExtraType(pt.id)} style={{
                            marginLeft:4,width:20,height:20,borderRadius:5,
                            border:"none",background:"rgba(0,0,0,0.08)",
                            color:"#9CA3AF",fontSize:11,cursor:"pointer",
                            display:"flex",alignItems:"center",justifyContent:"center",
                            flexShrink:0,
                          }}>×</button>
                        )}
                      </div>

                      {/* 本数カウンター */}
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                        <button onClick={()=>changeCount(pt.id,-1)} style={{
                          width:28,height:28,borderRadius:8,
                          border:"1px solid #E5E7EB",background:"#fff",
                          color:"#374151",fontSize:16,cursor:"pointer",
                          display:"flex",alignItems:"center",justifyContent:"center",
                        }}>−</button>
                        <span style={{
                          fontSize:24,fontWeight:900,color:pt.color,
                          minWidth:36,textAlign:"center",
                        }}>{target}</span>
                        <button onClick={()=>changeCount(pt.id,1)} style={{
                          width:28,height:28,borderRadius:8,
                          border:"1px solid #E5E7EB",background:"#fff",
                          color:"#374151",fontSize:16,cursor:"pointer",
                          display:"flex",alignItems:"center",justifyContent:"center",
                        }}>＋</button>
                        <span style={{fontSize:11,color:"#9CA3AF"}}>本 / 月</span>
                      </div>

                      {/* 区切り線 + 曜日ラベル */}
                      <div style={{borderTop:`1px solid ${pt.color}20`,paddingTop:12,marginBottom:8}}>
                        <div style={{fontSize:11,fontWeight:600,color:"#9CA3AF",marginBottom:8}}>投稿する曜日</div>
                        <div style={{display:"flex",gap:4}}>
                          {DAYS_JA.map((d,dow)=>{
                            const active=ws[dow].has(pt.id);
                            const isSunBtn=dow===0;
                            const isSatBtn=dow===6;
                            return(
                              <button key={dow} onClick={()=>toggleType(dow,pt.id)} style={{
                                flex:1,padding:"6px 0 8px",borderRadius:8,cursor:"pointer",
                                border:"none",
                                background:active?pt.color:isSunBtn?"#FEF2F2":isSatBtn?"#EFF9FF":"#fff",
                                color:active?"#fff":"#9CA3AF",
                                fontSize:11,fontWeight:active?700:400,
                                display:"flex",flexDirection:"column",alignItems:"center",gap:3,
                                transition:"all .12s",
                              }}>
                                <span>{d}</span>
                                <span style={{
                                  width:5,height:5,borderRadius:"50%",
                                  background:active?"rgba(255,255,255,0.8)":"transparent",
                                  display:"block",
                                }}/>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* ＋ 種別追加ボタン */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <button type="button" onClick={()=>setShowAddModal(true)} style={{
                    padding:"10px 16px",borderRadius:12,
                    border:"2px dashed #D1D5DB",background:"#fff",
                    color:"#9CA3AF",fontSize:12,fontWeight:600,cursor:"pointer",
                    display:"flex",flexDirection:"column",alignItems:"center",gap:4,
                    transition:"all .15s",minWidth:72,
                  }}>
                    <span style={{fontSize:20,lineHeight:1}}>＋</span>
                    <span>種別を追加</span>
                  </button>
                </div>
              </div>

              {/* ヒント + 保存 */}
              <div style={{
                display:"flex",alignItems:"center",justifyContent:"space-between",
                padding:"12px 14px",borderRadius:10,background:"#F9FAFB",
                border:"1px solid #F3F4F6",
              }}>
                <span style={{fontSize:13,color:"#6B7280",lineHeight:1.8,fontWeight:500}}>
                  🎌 祝日は自動で平日に振替 &nbsp;·&nbsp; バッジをドラッグで移動 &nbsp;·&nbsp; 平日クリックで休日設定
                </span>
                {hasSetup&&(
                  <button onClick={savePreset} style={{
                    flexShrink:0,marginLeft:12,
                    padding:"8px 16px",borderRadius:8,border:"none",
                    background:"#111",color:"#fff",
                    fontSize:12,fontWeight:700,cursor:"pointer",
                    whiteSpace:"nowrap",
                  }}>保存</button>
                )}
              </div>
            </div>
        </div>

        {/* ── カレンダー ── */}
        <div style={{
          background:"#fff",borderRadius:14,border:"1px solid #E5E7EB",
          overflow:"hidden",
        }}>
          {/* 月ナビ */}
          <div style={{
            display:"flex",alignItems:"center",justifyContent:"space-between",
            padding:"14px 20px",borderBottom:"1px solid #F3F4F6",
          }}>
            <button onClick={()=>goMonth(-1)} style={{
              width:34,height:34,borderRadius:9,
              border:"1px solid #E5E7EB",background:"#fff",
              color:"#374151",fontSize:16,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",
            }}>‹</button>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:18,fontWeight:800,color:"#111"}}>
                {year}年 {MONTHS_JA[month]}
              </div>
              {year===now.getFullYear()&&month===now.getMonth()&&(
                <div style={{fontSize:10,color:"#9CA3AF",marginTop:2}}>今月</div>
              )}
            </div>
            <button onClick={()=>goMonth(1)} style={{
              width:34,height:34,borderRadius:9,
              border:"1px solid #E5E7EB",background:"#fff",
              color:"#374151",fontSize:16,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",
            }}>›</button>
          </div>

          {/* 空状態 */}
          {!hasSetup&&(
            <div style={{padding:"60px 20px",textAlign:"center",color:"#9CA3AF"}}>
              <div style={{fontSize:32,marginBottom:12}}>📅</div>
              <div style={{fontSize:13,lineHeight:1.7}}>
                「設定」から投稿する曜日を選ぶと<br/>カレンダーが自動で生成されます
              </div>
            </div>
          )}

          {/* カレンダー本体（PNG出力対象） */}
          {hasSetup&&(
            <div ref={calRef} style={{background:"#fff",padding:"24px 24px 20px"}}>
              {/* ヘッダー */}
              <div style={{
                display:"flex",justifyContent:"space-between",alignItems:"flex-end",
                paddingBottom:12,marginBottom:12,
                borderBottom:"2px solid #111",
              }}>
                <div>
                  <div style={{fontSize:10,color:"#9CA3AF",letterSpacing:".1em",marginBottom:2}}>
                    SNS POSTING SCHEDULE
                  </div>
                  <div style={{fontSize:20,fontWeight:900,color:"#111"}}>{company||"クライアント名"}</div>
                  <div style={{fontSize:11,color:"#6B7280",marginTop:2}}>{PLANS.find(p=>p.id===planId)?.label}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:28,fontWeight:900,color:"#111",lineHeight:1}}>{MONTHS_JA[month]}</div>
                  <div style={{fontSize:11,color:"#9CA3AF"}}>{year}</div>
                </div>
              </div>

              {/* 凡例 */}
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12,alignItems:"center"}}>
                {allPostTypes.map(pt=>(
                  <div key={pt.id} style={{
                    display:"flex",alignItems:"center",gap:5,
                    padding:"3px 10px",borderRadius:20,
                    background:pt.lightBg,border:`1px solid ${pt.color}40`,
                  }}>
                    <span style={{fontSize:11,color:pt.color,fontWeight:700}}>{pt.icon} {pt.label}</span>
                    <span style={{fontSize:10,color:"#9CA3AF",paddingLeft:6,borderLeft:`1px solid ${pt.color}30`}}>
                      {posts.filter(p=>p.typeId===pt.id).length}/{counts[pt.id]??0}本
                    </span>
                  </div>
                ))}
                <div style={{padding:"3px 10px",borderRadius:20,background:"#FEF2F2",border:"1px solid #FECACA",fontSize:11,color:"#EF4444",fontWeight:600}}>
                  土 / 日 / 祝
                </div>
                <div style={{padding:"3px 10px",borderRadius:20,background:"#FFFBEB",border:"1px solid #FDE68A",fontSize:11,color:"#D97706",fontWeight:600}}>
                  ↩ 振替
                </div>
              </div>

              {/* 曜日ヘッダー */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:3}}>
                {DAYS_JA.map((d,i)=>(
                  <div key={i} style={{
                    textAlign:"center",fontSize:11,fontWeight:700,padding:"6px 0",borderRadius:6,
                    background:i===0?"#FEF2F2":i===6?"#EFF9FF":"#F9FAFB",
                    color:i===0?"#EF4444":i===6?"#0EA5E9":"#9CA3AF",
                  }}>{d}</div>
                ))}
              </div>

              {/* 日付グリッド */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:5}}>
                {cells.map((day,idx)=>{
                  if(!day) return <div key={idx}/>;
                  const dow=getDow(year,month,day);
                  const k=toKey(year,month,day);
                  const isBuiltIn=!!JP_HOLIDAYS[k];
                  const isManualH=manualH.has(k);
                  const isHol=isBuiltIn||isManualH;
                  const holName=JP_HOLIDAYS[k]||(isManualH?"手動休日":"");
                  const isSun=dow===0;
                  const isSat=dow===6;
                  const isRed=isSun||isHol;
                  const isToday=day===now.getDate()&&month===now.getMonth()&&year===now.getFullYear();
                  const isDrop=dragOver===day;
                  const postsHere=dayMap[day]||[];

                  return(
                    <div key={idx}
                      onDragOver={e=>onDragOver(e,day)}
                      onDragEnter={()=>setDragOver(day)}
                      onDrop={e=>onDrop(e,day)}
                      onClick={()=>!isBuiltIn&&!dragging&&toggleH(day)}
                      style={{
                        borderRadius:10,padding:"10px 6px 8px",
                        background:isDrop?"#F0FDF4":isRed?"#FEF2F2":isSat?"#EFF9FF":"#fff",
                        border:isDrop?"2px solid #22c55e":`1px solid ${isRed?"#FECACA":isSat?"#BAE6FD":"#E5E7EB"}`,
                        height:130,
                        display:"flex",flexDirection:"column",alignItems:"flex-start",
                        position:"relative",cursor:isBuiltIn?"default":"pointer",
                        userSelect:"none",
                        transition:"background .1s,border .1s",
                      }}
                    >

                      <div style={{
                        fontSize:16,fontWeight:600,
                        color:isRed?"#EF4444":isSat?"#0EA5E9":"#111",
                        marginBottom:(postsHere.length>0||isHol)?4:0,
                      paddingLeft:2,
                      }}>{day}</div>

                      {isHol&&holName&&(
                        <div style={{
                          fontSize:8,color:"#EF4444",fontWeight:700,
                          textAlign:"center",lineHeight:1.3,
                          marginBottom:postsHere.length>0?3:0,
                          wordBreak:"break-all",maxWidth:"100%",
                        }}>{holName}</div>
                      )}

                      <div style={{display:"flex",flexDirection:"column",gap:3,width:"100%",alignItems:"flex-start"}}>
                        {[...postsHere].sort((a,b)=>allPostTypes.findIndex(p=>p.id===a.post.typeId)-allPostTypes.findIndex(p=>p.id===b.post.typeId))
                          .map(({post,index})=>{
                            const pt=allPostTypes.find(p=>p.id===post.typeId);
                            const num=index<=CIRCLE_NUMS.length?CIRCLE_NUMS[index-1]:`(${index})`;
                            const isDrag=dragging===post.id;
                            return(
                              <div key={post.id}
                                draggable
                                onDragStart={e=>onDragStart(e,post.id)}
                                onDragEnd={onDragEnd}
                                style={{
                                  background:pt.color,
                                  color:"#fff",borderRadius:7,padding:"7px 6px",
                                  fontSize:13,fontWeight:800,letterSpacing:"-.01em",
                                  width:"100%",boxSizing:"border-box",
                                  display:"flex",alignItems:"center",justifyContent:"center",gap:2,
                                  cursor:"grab",
                                  opacity:isDrag?.35:1,
                                  boxShadow:isDrag?"none":`0 1px 4px ${pt.color}50`,
                                  outline:"none",
                                  transition:"opacity .15s",
                                  whiteSpace:"nowrap",
                                }}
                              >
                                {post.isShifted&&(
                                  <span style={{
                                    fontSize:11,fontWeight:900,
                                    background:"rgba(255,255,255,0.3)",
                                    borderRadius:3,padding:"0 3px",lineHeight:1.5,
                                  }}>振</span>
                                )}
                                <span>{pt.label}</span>
                                <span style={{fontSize:13,opacity:.95}}>{num}</span>
                              </div>
                            );
                          })}
                      </div>

                      {isDrop&&(
                        <div style={{
                          position:"absolute",inset:0,borderRadius:10,
                          display:"flex",alignItems:"center",justifyContent:"center",
                          pointerEvents:"none",fontSize:20,color:"#22c55e",
                        }}>＋</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* フッター */}
              <div style={{
                marginTop:14,paddingTop:10,borderTop:"1px solid #F3F4F6",
                display:"flex",justifyContent:"space-between",
                fontSize:10,color:"#D1D5DB",
              }}>
                <span>作成日: {now.getFullYear()}/{String(now.getMonth()+1).padStart(2,"0")}/{String(now.getDate()).padStart(2,"0")}</span>
                <span>SNS Posting Schedule</span>
              </div>
            </div>
          )}
        </div>

        {/* ── ダウンロード ── */}
        {hasSetup&&(
          <div style={{textAlign:"center",marginTop:20}}>
            <button onClick={download} disabled={dl} style={{
              padding:"13px 40px",borderRadius:12,border:"none",
              background:dl?"#E5E7EB":"#111",
              color:dl?"#9CA3AF":"#fff",
              fontSize:14,fontWeight:700,cursor:dl?"not-allowed":"pointer",
              boxShadow:dl?"none":"0 4px 20px rgba(0,0,0,.15)",
              transition:"all .15s",
            }}>
              {dl?"生成中...":"📥 PNG でダウンロード"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
