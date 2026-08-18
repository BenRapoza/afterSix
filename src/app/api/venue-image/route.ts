import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type FirecrawlSearch = { data?: { web?: Array<{ url?: string }> } };
type FirecrawlScrape = {
  success?: boolean;
  data?: {
    images?: string[];
    metadata?: { ogImage?: string };
    branding?: { images?: { ogImage?: string } };
  };
};

function publicUrl(value: string | null | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url : undefined;
  } catch {
    return undefined;
  }
}

export async function GET(request: NextRequest) {
  const key = process.env.FIRECRAWL_API_KEY;
  const title = request.nextUrl.searchParams.get("title") ?? "Boston venue";
  const suppliedUrl = publicUrl(request.nextUrl.searchParams.get("url"));
  if (!key) return new NextResponse(null, { status: 204 });

  let sourceUrl = suppliedUrl?.hostname.includes("google.") ? undefined : suppliedUrl?.toString();
  try {
    if (!sourceUrl) {
      const search = await fetch("https://api.firecrawl.dev/v2/search", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query: `${title} Boston official website`, limit: 1, sources: ["web"] }),
        signal: AbortSignal.timeout(4_000),
      });
      const data = await search.json() as FirecrawlSearch;
      sourceUrl = publicUrl(data.data?.web?.[0]?.url ?? null)?.toString();
    }
    if (!sourceUrl) return new NextResponse(null, { status: 204 });

    const scrape = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: sourceUrl, formats: ["images"], onlyMainContent: false, storeInCache: true }),
      signal: AbortSignal.timeout(6_000),
    });
    const data = await scrape.json() as FirecrawlScrape;
    const candidates = [
      data.data?.metadata?.ogImage,
      data.data?.branding?.images?.ogImage,
      ...(data.data?.images ?? []),
    ].filter((image): image is string => typeof image === "string" && Boolean(publicUrl(image)) && !/logo|favicon|icon/i.test(image));
    const image = candidates[0];
    if (!image) return new NextResponse(null, { status: 204 });
    const response = NextResponse.redirect(image, 302);
    response.headers.set("Cache-Control", "public, max-age=86400, s-maxage=604800");
    return response;
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
