import { NextResponse } from "next/server";

export const revalidate = 600;

type WeatherstackResponse = {
  current?: { temperature?: number; weather_descriptions?: string[] };
  error?: { info?: string };
};

function weatherEmoji(description: string) {
  const value = description.toLowerCase();
  if (/thunder|storm/.test(value)) return "⛈️";
  if (/snow|sleet|blizzard/.test(value)) return "❄️";
  if (/rain|drizzle|shower/.test(value)) return "🌧️";
  if (/fog|mist|haze/.test(value)) return "🌫️";
  if (/cloud|overcast/.test(value)) return "☁️";
  return "☀️";
}

export async function GET() {
  const key = process.env.WEATHERSTACK_API_KEY;
  if (!key) return new NextResponse(null, { status: 204 });
  try {
    const params = new URLSearchParams({ access_key: key, query: "Boston, MA", units: "f", fields: "temperature,weather_descriptions" });
    const response = await fetch(`https://api.weatherstack.com/current?${params}`, { next: { revalidate: 600 } });
    const data = await response.json() as WeatherstackResponse;
    const description = data.current?.weather_descriptions?.[0];
    const temperature = data.current?.temperature;
    if (!response.ok || data.error || !description || typeof temperature !== "number") return new NextResponse(null, { status: 204 });
    return NextResponse.json({ temperature, description, emoji: weatherEmoji(description) }, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=600" } });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
