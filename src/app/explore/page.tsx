import Link from "next/link";
import styles from "./page.module.css";
import mobileStyles from "./mobile.module.css";

export const dynamic = "force-dynamic";

type EventResponse = { page?: { totalElements?: number } };

function bostonDate(offsetDays = 0) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  const date = new Date(`${value.year}-${value.month}-${value.day}T12:00:00-04:00`);
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

async function ticketmasterCount(classificationName: string) {
  const key = process.env.TICKETMASTER_API_KEY;
  if (!key) return 0;
  const params = new URLSearchParams({ apikey: key, city: "Boston", stateCode: "MA", countryCode: "US", classificationName, startDateTime: `${bostonDate()}T00:00:00Z`, endDateTime: `${bostonDate(1)}T04:00:00Z`, size: "1" });
  try {
    const response = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${params}`, { next: { revalidate: 300 } });
    return response.ok ? ((await response.json()) as EventResponse).page?.totalElements ?? 0 : 0;
  } catch { return 0; }
}

async function nightlifeCount() {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return 0;
  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", { method: "POST", headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "places.id" }, body: JSON.stringify({ textQuery: "nightlife spots in Boston, MA", pageSize: 20 }) });
    return response.ok ? (((await response.json()) as { places?: unknown[] }).places?.length ?? 0) : 0;
  } catch { return 0; }
}

export default async function ExploreTonight() {
  const [music, comedy, theater, activities, ticketed, nightlife] = await Promise.all([ticketmasterCount("Music"), ticketmasterCount("Comedy"), ticketmasterCount("Arts & Theatre"), ticketmasterCount("Miscellaneous"), ticketmasterCount("Music"), nightlifeCount()]);
  const date = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "long", month: "long", day: "numeric" }).format(new Date());
  const items = [["🎵", music, "live music events"], ["😂", comedy, "comedy shows"], ["🎭", theater, "theater performances"], ["🎳", activities, "activities"], ["🍸", nightlife, "nightlife spots"], ["🎟️", ticketed, "ticketed events"]] as const;
  return <main className={styles.page}><nav className={`${styles.nav} ${mobileStyles.nav}`}><Link href="/" className={mobileStyles.back}>← <span>afterSix</span></Link><Link href="/planner">Build your night</Link></nav><section className={`${styles.content} ${mobileStyles.content}`}><p className={styles.kicker}>LIVE BOSTON DISCOVERY</p><h1>What&apos;s happening<br/><em>tonight?</em></h1><p className={`${styles.date} ${mobileStyles.date}`}>{date}</p><div className={`${styles.grid} ${mobileStyles.grid} glass-grid`}>{items.map(([icon, count, label]) => <article key={label}><span>{icon}</span><b>{count}</b><p className="explore-event-label">{label}</p></article>)}</div><Link className={`${styles.cta} ${mobileStyles.cta} glass-cta`} href="/planner?random=1">Build me a date around this →</Link><p className={`${styles.note} ${mobileStyles.note}`}>Live counts from Ticketmaster and Google Places.</p></section></main>;
}
