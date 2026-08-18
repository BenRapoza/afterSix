import { NextRequest, NextResponse } from "next/server";
import { bostonCatalog, type CatalogItem } from "@/lib/boston-catalog";

type TicketmasterEvent = { id: string; name: string; url?: string; images?: Array<{ url?: string; width?: number }>; dates?: { start?: { localTime?: string; localDate?: string } }; priceRanges?: Array<{ min?: number }>; classifications?: Array<{ segment?: { name?: string } }>; _embedded?: { venues?: Array<{ name?: string; city?: { name?: string }; location?: { latitude?: string; longitude?: string } }> } };
type GooglePlace = { id: string; displayName?: { text?: string }; formattedAddress?: string; location?: { latitude?: number; longitude?: number }; rating?: number; googleMapsUri?: string; primaryTypeDisplayName?: { text?: string }; photos?: Array<{ name?: string }>; currentOpeningHours?: { openNow?: boolean }; businessStatus?: string; priceLevel?: string };
type FirecrawlResult = { title?: string; description?: string; url?: string; metadata?: { title?: string; description?: string; sourceURL?: string } };
type GeoapifyFeature = { properties?: { place_id?: string; name?: string; formatted?: string; categories?: string[]; website?: string; datasource?: { raw?: { opening_hours?: string } } }; geometry?: { coordinates?: [number, number] } };
const BOSTON = { latitude: 42.3601, longitude: -71.0589 };

function isVenueSearchResult(item: FirecrawlResult) {
  const url = item.url ?? item.metadata?.sourceURL ?? "";
  const copy = `${item.title ?? ""} ${item.description ?? ""} ${item.metadata?.title ?? ""} ${item.metadata?.description ?? ""}`;
  const editorialPath = /(^|\/)(blog|news|guide|guides|events|articles?|magazine|press)(\/|$)|\/(best|top-?\d+|things-to-do)(\/|$)/i;
  const editorialCopy = /\b(blog|guide|best\s+\d+|top\s+\d+|things to do|where to|near me|roundup|list of|calendar|article)\b/i;
  const closed = /permanently closed|closed permanently|no longer open/i;
  return Boolean(url) && !editorialPath.test(url) && !editorialCopy.test(copy) && !closed.test(copy);
}
const drinkOptions = ["Cocktails", "Wine bars", "Breweries", "Sports bars", "Speakeasies", "Rooftop bars", "Lounges", "Nightlife"];
const eventOptions = ["Live music", "Local bands", "Open mic", "Comedy", "Theater"];
const activityOptions = ["Art events", "Museums with evening hours", "Activities", "Dancing"];

function minutesFromStart(value: string) {
  const digits = value.replace(/\D/g, "").padStart(4, "0");
  return Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2, 4));
}

function timeFromMinutes(minutes: number) {
  const safe = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}${String(safe % 60).padStart(2, "0")}`;
}

function spaceStops(dinner: CatalogItem | undefined, event: CatalogItem | undefined, drinks: CatalogItem | undefined): CatalogItem[] {
  if (!dinner || !event || !drinks) return [dinner, event, drinks].filter((item): item is CatalogItem => Boolean(item));
  const eventStart = minutesFromStart(event.start);
  const arrivalTime = event.arrivalTime ?? timeFromMinutes(eventStart - 15);
  const dinnerStart = Math.max(17 * 60 + 30, eventStart - 150);
  const eventEnd = minutesFromStart(event.endTime ?? timeFromMinutes(eventStart + event.durationMinutes));
  const drinksStart = eventEnd + 30;
  return [{ ...dinner, start: timeFromMinutes(dinnerStart) }, { ...event, arrivalTime, doorsTime: event.doorsTime ?? timeFromMinutes(eventStart - 60), endTime: event.endTime ?? timeFromMinutes(eventStart + event.durationMinutes) }, { ...drinks, start: timeFromMinutes(drinksStart) }];
}

function arrangeStops(dinner?: CatalogItem, middle?: CatalogItem, drinks?: CatalogItem): CatalogItem[] {
  if (dinner && middle && drinks) return spaceStops(dinner, middle, drinks);
  if (dinner && drinks) {
    return [{ ...dinner, start: "1830" }, { ...drinks, start: "2030" }];
  }
  if (middle && drinks) {
    const middleEnd = minutesFromStart(middle.endTime ?? timeFromMinutes(minutesFromStart(middle.start) + middle.durationMinutes));
    return [middle, { ...drinks, start: timeFromMinutes(middleEnd + 30) }];
  }
  if (dinner && middle) return [{ ...dinner, start: "1830" }, middle];
  return [dinner, middle, drinks].filter((item): item is CatalogItem => Boolean(item));
}

function catalogOption(category: CatalogItem["category"], offset: number, excluded: string[] = [], budget?: string, payer?: string, preference?: string) {
  const base = bostonCatalog.filter((item) => item.category === category && !excluded.includes(item.id));
  const tagged = preference ? base.filter((item) => item.tags?.includes(preference)) : [];
  const options = tagged.length ? tagged : base;
  const target = budgetTarget(budget, payer) * 25;
  const ranked = [...options].sort((a, b) => Math.abs(a.costPerPerson * 2 - target) - Math.abs(b.costPerPerson * 2 - target));
  return ranked.length ? ranked[offset % ranked.length] : undefined;
}

function distanceFromBoston(place: GooglePlace) {
  const latitude = place.location?.latitude ?? BOSTON.latitude;
  const longitude = place.location?.longitude ?? BOSTON.longitude;
  const lat = (latitude - BOSTON.latitude) * Math.PI / 180;
  const lng = (longitude - BOSTON.longitude) * Math.PI / 180;
  const a = Math.sin(lat / 2) ** 2 + Math.cos(BOSTON.latitude * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) * Math.sin(lng / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function budgetTarget(budget?: string, payer?: string) {
  const tier = budget === "$100–150" || budget === "$150+" ? 4 : budget === "$75–100" ? 3 : budget === "$50–75" ? 2 : 1;
  return payer === "Split evenly" ? Math.min(4, tier + 1) : tier;
}

function placeScore(place: GooglePlace, budget?: string, payer?: string) {
  const price = { PRICE_LEVEL_INEXPENSIVE: 1, PRICE_LEVEL_MODERATE: 2, PRICE_LEVEL_EXPENSIVE: 3, PRICE_LEVEL_VERY_EXPENSIVE: 4 }[place.priceLevel ?? ""] ?? 2;
  return (place.rating ?? 0) * 10 + (place.currentOpeningHours?.openNow ? 5 : 0) - distanceFromBoston(place) - Math.abs(price - budgetTarget(budget, payer)) * 3;
}

async function geocodeVenue(name: string, neighborhood: string) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return BOSTON;
  try {
    const address = encodeURIComponent(`${name}, ${neighborhood}, Boston, MA`);
    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${key}`, { signal: AbortSignal.timeout(2_000) });
    const data = await response.json() as { status?: string; results?: Array<{ geometry?: { location?: { lat?: number; lng?: number } } }> };
    const location = data.status === "OK" ? data.results?.[0]?.geometry?.location : undefined;
    return location ? { latitude: location.lat ?? BOSTON.latitude, longitude: location.lng ?? BOSTON.longitude } : BOSTON;
  } catch { return BOSTON; }
}

async function geoapifyPlace(category: CatalogItem["category"], start: string, variant = 0, excluded: string[] = []): Promise<CatalogItem | undefined> {
  const key = process.env.GEOAPIFY_API_KEY;
  if (!key) return undefined;
  const queryCategory = category === "dinner" ? "catering.restaurant" : category === "drinks" ? "catering.bar" : "entertainment.museum";
  try {
    const params = new URLSearchParams({ categories: queryCategory, filter: "circle:-71.0589,42.3601,7000", bias: "proximity:-71.0589,42.3601", limit: "20", apiKey: key });
    const response = await fetch(`https://api.geoapify.com/v2/places?${params}`, { signal: AbortSignal.timeout(1_500) });
    if (!response.ok) return undefined;
    const features = ((await response.json()) as { features?: GeoapifyFeature[] }).features ?? [];
    const available = features.filter((item) => !excluded.includes(`geoapify-${item.properties?.place_id ?? item.properties?.name}`));
    const feature = (available.length ? available : features)[variant % (available.length || features.length)];
    const coordinates = feature?.geometry?.coordinates;
    const properties = feature?.properties;
    if (!coordinates || !properties?.name) return undefined;
    return { id: `geoapify-${properties.place_id ?? properties.name}`, name: properties.name, neighborhood: properties.formatted?.replace(/,? Boston,? Massachusetts.*$/i, "") || "Boston", category, start, durationMinutes: category === "dinner" ? 90 : 60, costPerPerson: 0, bookingStatus: category === "drinks" ? "not_needed" : "recommended", description: `${properties.categories?.[0]?.replaceAll(".", " · ") ?? "Boston venue"} · Geoapify`, sourceUrl: properties.website ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(properties.name)}`, availabilityUpdatedAt: new Date().toISOString(), availabilityNote: properties.datasource?.raw?.opening_hours ? `Hours: ${properties.datasource.raw.opening_hours}` : "Geoapify place data", latitude: coordinates[1], longitude: coordinates[0] };
  } catch { return undefined; }
}

async function addRouteTimes(stops: CatalogItem[], transport?: string) {
  const key = process.env.GEOAPIFY_API_KEY;
  if (!key || stops.length < 2) return stops;
  const mode = transport === "Walking" ? "walk" : transport === "Public transit" ? "transit" : "drive";
  const next = [...stops];
  await Promise.all(next.slice(0, -1).map(async (stop, index) => {
    const destination = next[index + 1];
    try {
      const params = new URLSearchParams({ waypoints: `${stop.latitude},${stop.longitude}|${destination.latitude},${destination.longitude}`, mode, apiKey: key });
      const response = await fetch(`https://api.geoapify.com/v1/routing?${params}`, { signal: AbortSignal.timeout(1_500) });
      const route = ((await response.json()) as { features?: Array<{ properties?: { distance?: number; time?: number } }> }).features?.[0]?.properties;
      if (route?.distance && route.time) next[index] = { ...stop, travelToNext: { distanceMiles: Number((route.distance / 1609.344).toFixed(1)), minutes: Math.max(1, Math.round(route.time / 60)), mode } };
    } catch { /* the local estimate remains available */ }
  }));
  return next;
}

async function googlePlace(query: string, category: CatalogItem["category"], start: string, variant = 0, budget?: string, payer?: string, excluded: string[] = []): Promise<CatalogItem | undefined> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return undefined;
  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.googleMapsUri,places.primaryTypeDisplayName,places.photos,places.currentOpeningHours,places.businessStatus,places.priceLevel" },
      body: JSON.stringify({ textQuery: query, locationBias: { circle: { center: BOSTON, radius: 6000 } }, languageCode: "en" }),
      signal: AbortSignal.timeout(1_750),
    });
    if (!response.ok) return undefined;
    const places = ((await response.json()) as { places?: GooglePlace[] }).places?.filter((item) => item.location && item.displayName?.text && (item.businessStatus === undefined || item.businessStatus === "OPERATIONAL")).sort((a, b) => placeScore(b, budget, payer) - placeScore(a, budget, payer)) ?? [];
    const available = places.filter((item) => !excluded.includes(`google-${item.id}`));
    const place = (available.length ? available : places)[variant % (available.length || places.length)];
    if (!place?.location || !place.displayName?.text) return undefined;
    const rating = place.rating ? ` · ${place.rating.toFixed(1)}★` : "";
    const photo = place.photos?.[0]?.name;
    const fallbackType = category === "drinks" ? "Cocktail bar" : category === "activity" ? "Evening activity" : "Restaurant";
    const availabilityNote = place.currentOpeningHours?.openNow === true ? "Open now · live Google hours" : "Hours should be confirmed";
    return { id: `google-${place.id}`, name: place.displayName.text, neighborhood: place.formattedAddress?.replace(/,? Boston,? MA.*$/i, "") || "Boston", category, start, durationMinutes: category === "dinner" ? 90 : 60, costPerPerson: 0, bookingStatus: "recommended", description: `${place.primaryTypeDisplayName?.text ?? fallbackType}${rating} · Google Places`, sourceUrl: place.googleMapsUri ?? "https://maps.google.com/", availabilityUpdatedAt: new Date().toISOString(), availabilityNote, latitude: place.location.latitude ?? BOSTON.latitude, longitude: place.location.longitude ?? BOSTON.longitude, imageUrl: photo ? `/api/place-photo?name=${encodeURIComponent(photo)}` : undefined };
  } catch { return undefined; }
}

async function firecrawlPlace(query: string, category: CatalogItem["category"], start: string, variant = 0, excluded: string[] = []): Promise<CatalogItem | undefined> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return undefined;
  try {
    const response = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: `${query} official website`, limit: 5, sources: ["web"], location: "Boston, Massachusetts, United States", country: "US", timeout: 2_000 }),
      signal: AbortSignal.timeout(1_500),
    });
    if (!response.ok) return undefined;
    const data = await response.json() as { success?: boolean; data?: { web?: FirecrawlResult[] } };
    const excludedHosts = /yelp|tripadvisor|opentable|resy|instagram|facebook|tiktok/i;
    const results = (data.data?.web ?? []).filter((item) => item.url && !excludedHosts.test(item.url) && (item.title || item.metadata?.title) && isVenueSearchResult(item));
    const available = results.filter((item) => !excluded.includes(`firecrawl-${encodeURIComponent(item.url ?? item.title ?? "")}`));
    const result = (available.length ? available : results)[variant % (available.length || results.length)];
    if (!result) return undefined;
    const rawName = result.title ?? result.metadata?.title ?? "Boston venue";
    const name = rawName.replace(/\s+[|—–-]\s+[^|—–-]+$/, "").trim();
    const fallbackType = category === "drinks" ? "Bar" : category === "activity" ? "Evening activity" : "Restaurant";
    return { id: `firecrawl-${encodeURIComponent(result.url ?? name)}`, name, neighborhood: "Boston", category, start, durationMinutes: category === "dinner" ? 90 : 60, costPerPerson: 0, bookingStatus: category === "drinks" ? "not_needed" : "recommended", description: result.description ?? result.metadata?.description ?? `${fallbackType} discovered via Firecrawl`, sourceUrl: result.url ?? result.metadata?.sourceURL ?? "https://www.google.com/maps", availabilityUpdatedAt: new Date().toISOString(), availabilityNote: "Official site found via Firecrawl", ...BOSTON };
  } catch { return undefined; }
}

async function ticketmasterEvent(mood?: string, variant = 0, excluded: string[] = [], date?: string): Promise<CatalogItem | undefined> {
  const key = process.env.TICKETMASTER_API_KEY;
  if (!key) return undefined;
  const classificationName = mood === "Comedy" ? "Comedy" : mood === "Theater" ? "Arts & Theatre" : "Music";
  const keyword = mood === "Open mic" ? "open mic" : mood === "Local bands" ? "local band" : mood === "Live music" ? "live music" : undefined;
  const nextDate = date ? new Date(`${date}T12:00:00Z`) : undefined;
  if (nextDate) nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  const params = new URLSearchParams({ apikey: key, city: "Boston", stateCode: "MA", countryCode: "US", classificationName, size: "10", sort: "date,asc", ...(keyword ? { keyword } : {}), ...(date ? { startDateTime: `${date}T00:00:00Z`, endDateTime: `${nextDate!.toISOString().slice(0, 10)}T04:00:00Z` } : {}) });
  try {
    const response = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${params}`, { signal: AbortSignal.timeout(1_750) });
    if (!response.ok) return undefined;
    const data = await response.json() as { _embedded?: { events?: TicketmasterEvent[] } };
    const events = data._embedded?.events?.filter((item) => item._embedded?.venues?.[0]) ?? [];
    const available = events.filter((item) => !excluded.includes(`ticketmaster-${item.id}`));
    const event = (available.length ? available : events)[variant % (available.length || events.length)];
    const venue = event?._embedded?.venues?.[0];
    if (!event || !venue) return undefined;
    const suppliedLatitude = Number(venue.location?.latitude), suppliedLongitude = Number(venue.location?.longitude);
    const coordinates = Number.isFinite(suppliedLatitude) && Number.isFinite(suppliedLongitude) ? { latitude: suppliedLatitude, longitude: suppliedLongitude } : await geocodeVenue(venue.name ?? event.name, venue.city?.name ?? "Boston");
    const isComedy = event.classifications?.some((item) => item.segment?.name === "Comedy") ?? mood === "Comedy";
    const start = event.dates?.start?.localTime?.slice(0, 5).replace(":", "") ?? "2015";
    const startMinutes = minutesFromStart(start);
    const image = event.images?.sort((a, b) => Math.abs((a.width ?? 800) - 800) - Math.abs((b.width ?? 800) - 800))[0]?.url;
    return { id: `ticketmaster-${event.id}`, name: event.name, neighborhood: venue.name ?? "Boston", category: isComedy ? "comedy" : "live_music", start, arrivalTime: timeFromMinutes(startMinutes - 15), doorsTime: timeFromMinutes(startMinutes - 60), endTime: timeFromMinutes(startMinutes + 120), durationMinutes: 120, costPerPerson: event.priceRanges?.[0]?.min ?? 0, bookingStatus: "ticket_required", description: `Live event${event.dates?.start?.localDate ? ` · ${event.dates.start.localDate}` : ""}`, sourceUrl: event.url ?? "https://www.ticketmaster.com/", availabilityUpdatedAt: new Date().toISOString(), imageUrl: image ? `/api/event-image?url=${encodeURIComponent(image)}` : undefined, ...coordinates };
  } catch { return undefined; }
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const input = await request.json() as { mood?: string; moods?: string[]; food?: string; transport?: string; budget?: string; payer?: string; date?: string; startTime?: string; variant?: number; seed?: number; random?: boolean; excludeIds?: string[] };
  const variant = input.variant ?? 0;
  const optionOffset = (input.seed ?? 0) + variant;
  const excluded = input.excludeIds ?? [];
  const selections = input.moods?.length ? input.moods : input.mood ? [input.mood] : [];
  const wantsDinner = selections.some((item) => ["Dinner", "Appetizers"].includes(item));
  const selectedDrinks = selections.filter((item) => drinkOptions.includes(item));
  const selectedEvents = selections.filter((item) => eventOptions.includes(item));
  const selectedActivities = selections.filter((item) => activityOptions.includes(item));
  const drinkPreference = selectedDrinks.length ? selectedDrinks[variant % selectedDrinks.length] : undefined;
  const eventMood = selectedEvents.length ? selectedEvents[variant % selectedEvents.length] : undefined;
  const activityPreference = selectedActivities.length ? selectedActivities[variant % selectedActivities.length] : undefined;
  const wantsDrinks = selectedDrinks.length > 0 || activityPreference === "Dancing";
  const wantsArt = selections.some((item) => ["Art events", "Museums with evening hours"].includes(item));
  const wantsActivity = activityPreference === "Activities";
  const dinnerQuery = `${input.food && input.food !== "Any cuisine" ? input.food : "great"} restaurant in Boston, MA`;
  const drinkQuery = activityPreference === "Dancing" ? "dance club with cocktails in Boston, MA" : drinkPreference === "Lounges" ? "cocktail lounge in Boston, MA" : drinkPreference === "Wine bars" ? "wine bar in Boston, MA" : drinkPreference === "Breweries" ? "brewery in Boston, MA" : drinkPreference === "Sports bars" ? "sports bar in Boston, MA" : drinkPreference === "Speakeasies" ? "speakeasy cocktail bar in Boston, MA" : drinkPreference === "Rooftop bars" ? "rooftop cocktail bar in Boston, MA" : "craft cocktail bar in Boston, MA";
  const artQuery = activityPreference === "Museums with evening hours" ? "museum with evening hours in Boston, MA" : activityPreference === "Activities" ? "evening activity in Boston, MA" : "art event venue in Boston, MA";
  const [liveEvent, liveDinner, liveDrinks, liveArt, crawledDinner, crawledDrinks, crawledArt, geoDinner, geoDrinks, geoArt] = await Promise.all([
    eventMood ? ticketmasterEvent(eventMood, optionOffset, excluded, input.date) : Promise.resolve(undefined),
    wantsDinner ? googlePlace(dinnerQuery, "dinner", "1830", optionOffset, input.budget, input.payer, excluded) : Promise.resolve(undefined),
    wantsDrinks ? googlePlace(drinkQuery, "drinks", "2030", optionOffset, input.budget, input.payer, excluded) : Promise.resolve(undefined),
    wantsArt ? googlePlace(artQuery, "activity", "2015", optionOffset, input.budget, input.payer, excluded) : Promise.resolve(undefined),
    wantsDinner ? firecrawlPlace(dinnerQuery, "dinner", "1830", optionOffset, excluded) : Promise.resolve(undefined),
    wantsDrinks ? firecrawlPlace(drinkQuery, "drinks", "2030", optionOffset, excluded) : Promise.resolve(undefined),
    wantsArt ? firecrawlPlace(artQuery, "activity", "2015", optionOffset, excluded) : Promise.resolve(undefined),
    wantsDinner ? geoapifyPlace("dinner", "1830", optionOffset, excluded) : Promise.resolve(undefined),
    wantsDrinks ? geoapifyPlace("drinks", "2030", optionOffset, excluded) : Promise.resolve(undefined),
    wantsArt ? geoapifyPlace("activity", "2015", optionOffset, excluded) : Promise.resolve(undefined),
  ]);
  const entertainment = eventMood ? liveEvent ?? catalogOption(eventMood === "Comedy" ? "comedy" : "live_music", optionOffset, excluded, input.budget, input.payer, eventMood) : undefined;
  const preferCrawled = optionOffset % 2 === 0;
  const dinner = wantsDinner ? (preferCrawled ? crawledDinner ?? liveDinner ?? geoDinner : liveDinner ?? geoDinner ?? crawledDinner) ?? catalogOption("dinner", optionOffset, excluded, input.budget, input.payer) : undefined;
  const exactDrink = drinkPreference ? catalogOption("drinks", optionOffset, excluded, input.budget, input.payer, drinkPreference) : undefined;
  const drinks = wantsDrinks ? (drinkPreference ? (preferCrawled ? crawledDrinks ?? liveDrinks ?? exactDrink ?? geoDrinks : liveDrinks ?? crawledDrinks ?? exactDrink ?? geoDrinks) : (preferCrawled ? crawledDrinks ?? liveDrinks ?? geoDrinks : liveDrinks ?? geoDrinks ?? crawledDrinks) ?? catalogOption("drinks", optionOffset, excluded, input.budget, input.payer)) : undefined;
  const activity = wantsArt ? (preferCrawled ? crawledArt ?? liveArt ?? geoArt : liveArt ?? geoArt ?? crawledArt) ?? catalogOption("activity", optionOffset, excluded, input.budget, input.payer) : wantsActivity ? catalogOption("activity", optionOffset, excluded, input.budget, input.payer) : undefined;
  const middle = entertainment ?? activity;

  const itinerary = await addRouteTimes(arrangeStops(dinner, middle, drinks), input.transport);
  const response = NextResponse.json({
    city: "Boston, MA",
    input,
    itinerary,
    generatedAt: new Date().toISOString(),
    source: crawledDinner || crawledDrinks || crawledArt ? "Firecrawl + Ticketmaster + Google Places with afterSix fallback" : liveEvent || liveDinner || liveDrinks || liveArt ? "Ticketmaster + Google Places with afterSix fallback" : "afterSix Boston catalog",
  });
  console.log(JSON.stringify({ level: "info", msg: "itinerary_generated", route: "/api/itineraries/generate", ms: Date.now() - startedAt, requestId: request.headers.get("x-vercel-id"), stops: itinerary.length }));
  return response;
}
