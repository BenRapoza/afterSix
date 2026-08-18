import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type Params = { params: Promise<{ code: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { code } = await params;
  const db = getSupabaseAdmin();
  const { data: night, error } = await db.from("saved_nights").select("id, title, itinerary, selected_option, is_finalized, created_at").eq("share_code", code).maybeSingle();
  if (error || !night) return NextResponse.json({ error: "Night not found" }, { status: 404 });
  const { data: votes } = await db.from("night_votes").select("option_index").eq("night_id", night.id);
  const counts = [0, 0, 0];
  (votes ?? []).forEach((vote) => { if (vote.option_index >= 0 && vote.option_index < 3) counts[vote.option_index] += 1; });
  return NextResponse.json({ night, votes: counts });
}

export async function POST(request: NextRequest, { params }: Params) {
  const { code } = await params;
  const input = await request.json() as { action?: "vote" | "finalize"; optionIndex?: number; voterKey?: string };
  const db = getSupabaseAdmin();
  const { data: night } = await db.from("saved_nights").select("id, clerk_user_id").eq("share_code", code).maybeSingle();
  if (!night) return NextResponse.json({ error: "Night not found" }, { status: 404 });
  if (input.action === "vote") {
    if (!Number.isInteger(input.optionIndex) || input.optionIndex! < 0 || input.optionIndex! > 2 || !input.voterKey?.trim()) return NextResponse.json({ error: "A valid vote is required" }, { status: 400 });
    const { error } = await db.from("night_votes").upsert({ night_id: night.id, voter_key: input.voterKey.slice(0, 120), option_index: input.optionIndex }, { onConflict: "night_id,voter_key" });
    if (error) return NextResponse.json({ error: "Unable to save vote" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  if (input.action === "finalize") {
    const { userId } = await auth();
    if (!userId || userId !== night.clerk_user_id) return NextResponse.json({ error: "Only the host can finalize" }, { status: 403 });
    if (!Number.isInteger(input.optionIndex) || input.optionIndex! < 0 || input.optionIndex! > 2) return NextResponse.json({ error: "A valid option is required" }, { status: 400 });
    const { error } = await db.from("saved_nights").update({ selected_option: input.optionIndex, is_finalized: true }).eq("id", night.id);
    if (error) return NextResponse.json({ error: "Unable to finalize" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
