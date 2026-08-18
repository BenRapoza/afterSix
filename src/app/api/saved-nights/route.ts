import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const shareCode = () => crypto.randomUUID().replaceAll("-", "");

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await getSupabaseAdmin().from("saved_nights").select("id, title, created_at, share_code, selected_option, is_finalized").eq("clerk_user_id", userId).order("created_at", { ascending: false }).limit(20);
  if (error) return NextResponse.json({ error: "Unable to load saved nights" }, { status: 500 });
  return NextResponse.json({ nights: data ?? [] });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const input = await request.json() as { title?: string; itinerary?: unknown };
  if (!Array.isArray(input.itinerary)) return NextResponse.json({ error: "An itinerary is required" }, { status: 400 });
  const { data, error } = await getSupabaseAdmin().from("saved_nights").insert({ clerk_user_id: userId, title: input.title ?? "Moonlit Boston", itinerary: input.itinerary, share_code: shareCode() }).select("id, share_code").single();
  if (error) return NextResponse.json({ error: "Unable to save night" }, { status: 500 });
  return NextResponse.json({ ok: true, night: data });
}
