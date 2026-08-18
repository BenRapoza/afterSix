import { NextRequest, NextResponse } from "next/server";

function ticketmasterImage(value: string | null) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return /(^|\.)ticketmaster\.com$|(^|\.)tmimages\.com$/i.test(url.hostname) ? url : undefined;
  } catch { return undefined; }
}

export async function GET(request: NextRequest) {
  const source = ticketmasterImage(request.nextUrl.searchParams.get("url"));
  if (!source) return new NextResponse(null, { status: 400 });
  try {
    const response = await fetch(source, { next: { revalidate: 60 * 60 * 24 * 30 } });
    if (!response.ok || !response.body) return new NextResponse(null, { status: response.status });
    return new NextResponse(response.body, { headers: { "Content-Type": response.headers.get("content-type") ?? "image/jpeg", "Cache-Control": "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800" } });
  } catch { return new NextResponse(null, { status: 502 }); }
}
