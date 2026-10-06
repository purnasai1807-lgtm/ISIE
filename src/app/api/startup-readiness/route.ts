import { NextResponse } from "next/server";
export async function GET() {
  const url = process.env.BACKEND_URL || "http://127.0.0.1:8080";
  try {
    const r = await fetch(`${url.replace(/\/$/,"")}/v1/startup/readiness`, { cache: "no-store" });
    return NextResponse.json(await r.json(), { status: r.status });
  } catch {
    return NextResponse.json({ status:"unavailable", softwareModulesComplete:false }, { status:503 });
  }
}
