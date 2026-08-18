import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key || !name || !/^places\/[^/]+\/photos\/[^/]+$/.test(name)) return new NextResponse(null, { status: 400 });
  const response = await fetch(`https://places.googleapis.com/v1/${name}/media?maxHeightPx=320&key=${key}`);
  if (!response.ok) return new NextResponse(null, { status: response.status });
  return new NextResponse(response.body, { headers: { "Content-Type": response.headers.get("content-type") ?? "image/jpeg", "Cache-Control": "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800" } });
}
