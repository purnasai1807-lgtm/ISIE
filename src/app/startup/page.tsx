"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { CheckCircle2, CircleAlert, Cloud, CreditCard, Database, Radio, ShieldCheck } from "lucide-react";

export default function StartupPage() {
  const [data,setData]=useState<any>(null); const [ready,setReady]=useState<any>(null);
  useEffect(()=>{Promise.all([fetch("/api/startup-capabilities",{cache:"no-store"}).then(r=>r.json()),fetch("/api/startup-readiness",{cache:"no-store"}).then(r=>r.json())]).then(([a,b])=>{setData(a);setReady(b)}).catch(()=>setData({error:true}))},[]);
  return <AppShell pageTitle="Startup Layer // Integrations & Commercial Readiness">
    <div className="p-4 md:p-6 max-w-6xl mx-auto w-full space-y-6">
      <div className="border border-white/10 bg-isie-panel p-5">
        <div className="flex items-center gap-3"><ShieldCheck className="text-isie-cyan"/><h1 className="font-mono text-xl font-bold uppercase tracking-wider">Startup Capability Center</h1></div>
        <p className="text-xs text-isie-text-secondary mt-2">Provider readiness, data provenance, human approval controls and commercial integration status.</p>
      </div>
      {data?.error && <div className="p-4 border border-red-500/30 text-red-300">Capability service unavailable.</div>}
      <div className="border border-white/10 bg-isie-panel p-5">
        <div className="flex items-center justify-between"><div className="font-mono text-sm uppercase">Software completeness</div><div className={ready?.softwareModulesComplete?"text-emerald-400":"text-red-400"}>{ready?.softwareModulesComplete?"100% IMPLEMENTED":"NOT VERIFIED"}</div></div>
        <div className="text-xs text-isie-text-secondary mt-2">{ready?.status || "Checking production gates…"}</div>
        <div className="text-[10px] font-mono mt-3">EXTERNAL EVIDENCE BLOCKERS: {(ready?.blockers||[]).length}</div>
        <p className="text-[11px] text-isie-text-dim mt-2">Credentials, agency authorization, scientific validation, security review and regulatory evidence cannot be fabricated by software.</p>
      </div>
      {ready?.checks && <div className="grid md:grid-cols-2 gap-3">{ready.checks.map((c:any)=><div key={c.key} className="border border-white/10 bg-isie-panel p-3"><div className="flex justify-between text-xs font-mono uppercase"><span>{c.name}</span><span className={c.configured?"text-emerald-400":"text-amber-400"}>{c.configured?"READY":"REQUIRED"}</span></div></div>)}</div>}
      <div className="grid md:grid-cols-2 gap-3">
        {(data?.services||[]).map((s:any)=><div key={s.key} className="border border-white/10 bg-isie-panel p-4">
          <div className="flex items-center justify-between gap-3"><div className="font-mono font-semibold uppercase text-sm">{s.name}</div>{s.operational?<CheckCircle2 className="w-4 h-4 text-emerald-400"/>:<CircleAlert className="w-4 h-4 text-amber-400"/>}</div>
          <div className="text-[11px] text-isie-text-dim mt-1">{s.category} · {s.mode}</div><p className="text-xs text-isie-text-secondary mt-2">{s.note}</p>
          <div className="mt-3 text-[10px] font-mono">CONFIGURED: {s.configured?"YES":"NO"} · OPERATIONAL: {s.operational?"YES":"NO"}</div>
        </div>)}
      </div>
      <div className="grid sm:grid-cols-4 gap-3">
        {[['Data feeds',Database],['Dispatch control',Radio],['Cloud',Cloud],['Billing',CreditCard]].map(([label,Icon]:any)=><div key={label as string} className="border border-white/10 p-4 bg-isie-panel"><Icon className="w-4 h-4 text-isie-cyan"/><div className="text-xs font-mono mt-2 uppercase">{label}</div></div>)}
      </div>
    </div>
  </AppShell>
}
