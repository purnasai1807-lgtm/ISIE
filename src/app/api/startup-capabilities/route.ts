import { NextResponse } from "next/server";
export async function GET(){
  const url=process.env.ISIE_BACKEND_URL;
  if(!url) return NextResponse.json({services:[],error:"ISIE_BACKEND_URL not configured"},{status:200});
  try { const r=await fetch(`${url.replace(/\/$/,"")}/v1/startup/capabilities`,{cache:"no-store"}); return NextResponse.json(await r.json(),{status:r.status}); }
  catch { return NextResponse.json({services:[],error:"backend unavailable"},{status:200}); }
}
