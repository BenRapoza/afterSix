import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await getSupabaseAdmin().from("user_profiles").select("name, home_base, dietary_preferences, transportation").eq("clerk_user_id", userId).maybeSingle();
  if (error) return NextResponse.json({ error: "Unable to load profile" }, { status: 500 });
  return NextResponse.json({ profile: data });
}

export async function PUT(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const input = await request.json() as { name?: string; homeBase?: string; dietary?: string; transportation?: string };
  const { error } = await getSupabaseAdmin().from("user_profiles").upsert({ clerk_user_id: userId, name: input.name ?? null, home_base: input.homeBase ?? "Boston, MA", dietary_preferences: input.dietary ?? "No restrictions", transportation: input.transportation ?? "Rideshare", updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: "Unable to save profile" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
