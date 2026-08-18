"use client";

import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  Clock3,
  MapPin,
  Search,
  Sparkles,
  Ticket,
  Utensils,
  Wine,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { bostonCatalog, type CatalogItem } from "@/lib/boston-catalog";
import { transportationEstimate, transportationLinks, type TransportationChoice } from "@/lib/transportation";

const MapMount = dynamic(() => import("./MapMount"), { ssr: false });

const moods = [
  "Dinner",
  "Appetizers",
  "Cocktails",
  "Wine bars",
  "Breweries",
  "Sports bars",
  "Speakeasies",
  "Rooftop bars",
  "Dancing",
  "Lounges",
  "Art events",
  "Museums with evening hours",
  "Open mic",
  "Local bands",
  "Nightlife",
  "Live music",
  "Comedy",
  "Theater",
  "Activities",
];
const discoveries = [
  ["14", "Live music", "♫"],
  ["06", "Comedy shows", "◌"],
  ["12", "Ticketed events", "✦"],
  ["27", "Night spots", "●"],
];
const budgetRanges = ["Under $30", "$30–50", "$50–75", "$75–100", "$100–150", "$150+"];
const plannerVenueCards = [
  ["Yvonne's", "Downtown Crossing", "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=900&q=90"],
  ["Committee", "Seaport", "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=900&q=90"],
  ["MGM Music Hall", "Fenway", "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=900&q=90"],
  ["Lookout Rooftop", "Seaport", "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=900&q=90"],
  ["Row 34", "Fort Point", "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=90"],
  ["Wally's Café", "South End", "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=90"],
  ["Drink", "Fort Point", "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&w=900&q=90"],
  ["Laugh Boston", "Seaport", "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=900&q=90"],
] as const;
const venueUrls: Record<string, string> = {
  "Row 34": "https://www.row34.com/locations-and-reservations/",
  "Wally's Café Jazz Club": "https://wallyscafe.com/visit-wallys/",
  Drink: "https://www.drinkfortpoint.com/",
  "Yvonne's": "https://www.yvonnesboston.com/",
  "Laugh Boston": "https://www.laughboston.com/",
  "Kings Dining & Entertainment": "https://www.kingsbowling.com/",
};

function randomPlannerPicks(previous: readonly (typeof plannerVenueCards)[number][] = []) {
  const shuffled = [...plannerVenueCards].sort(() => Math.random() - 0.5);
  const next = shuffled.slice(0, 4);
  return next.some(([name], index) => previous[index]?.[0] === name)
    ? [...shuffled.slice(4), ...shuffled].filter((item, index, all) => all.findIndex(([name]) => name === item[0]) === index).slice(0, 4)
    : next;
}

export default function Home({ plannerOnly = false, howOnly = false }: { plannerOnly?: boolean; howOnly?: boolean }) {
  const [mood, setMood] = useState("Dinner");
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [food, setFood] = useState("Any cuisine");
  const [transport, setTransport] = useState("Rideshare");
  const [nightDate, setNightDate] = useState("2026-08-17");
  const [startTime, setStartTime] = useState("18:30");
  const [budgetIndex, setBudgetIndex] = useState(2);
  const [payer, setPayer] = useState("Split evenly");
  const [planned, setPlanned] = useState(false);
  const [itinerary, setItinerary] = useState<CatalogItem[]>([]);
  const [itineraryOptions, setItineraryOptions] = useState<CatalogItem[][]>([]);
  const [activeOption, setActiveOption] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<Record<string, "saved" | "skipped" | "more">>({});
  const [savedNight, setSavedNight] = useState<{ id: string; share_code: string } | null>(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [regeneratingStop, setRegeneratingStop] = useState<string | null>(null);
  const [recentVenueIds, setRecentVenueIds] = useState<string[]>([]);
  const [plannerPicks, setPlannerPicks] = useState(() => plannerVenueCards.slice(0, 4));
  const autoBuildStarted = useRef(false);
  const needsFood =
    selectedMoods.includes("Dinner") || selectedMoods.includes("Appetizers");
  const alcoholFocused = selectedMoods.some((item) =>
    ["Cocktails", "Wine bars", "Breweries"].includes(item),
  );

  useEffect(() => {
    setPlannerPicks((current) => randomPlannerPicks(current));
    const saved = localStorage.getItem("aftersix-feedback");
    if (saved) setFeedback(JSON.parse(saved));
    const recent = localStorage.getItem("aftersix-recent-venues");
    if (recent) setRecentVenueIds(JSON.parse(recent));
  }, []);

  function recordFeedback(id: string, action: "saved" | "skipped" | "more") {
    setFeedback((current) => {
      const next = { ...current, [id]: action };
      localStorage.setItem("aftersix-feedback", JSON.stringify(next));
      return next;
    });
  }

  async function saveNight() {
    if (savedNight || !itinerary.length) return;
    setSaveMessage("Saving…");
    const response = await fetch("/api/saved-nights", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Moonlit Boston", itinerary }) });
    const data = await response.json() as { night?: { id: string; share_code: string }; error?: string };
    if (!response.ok || !data.night) { setSaveMessage(data.error === "Unauthorized" ? "Sign in to save" : "Couldn’t save night"); return; }
    setSavedNight(data.night);
    setSaveMessage("Saved");
  }

  async function shareNight() {
    if (!savedNight) { await saveNight(); return; }
    const url = `${window.location.origin}/share/${savedNight.share_code}`;
    await navigator.clipboard?.writeText(url);
    setSaveMessage("Share link copied");
  }

  async function finalizeNight() {
    if (!savedNight) { await saveNight(); return; }
    const response = await fetch(`/api/shared-nights/${savedNight.share_code}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "finalize", optionIndex: activeOption }) });
    setSaveMessage(response.ok ? `Option ${String.fromCharCode(65 + activeOption)} finalized` : "Couldn’t finalize night");
  }

  function rememberVenues(options: CatalogItem[][]) {
    setRecentVenueIds((current) => {
      const next = [...new Set([...current, ...options.flat().map((item) => item.id)])].slice(-60);
      localStorage.setItem("aftersix-recent-venues", JSON.stringify(next));
      return next;
    });
  }

  function toggleMood(item: string) {
    setSelectedMoods((current) => {
      if (current.includes(item))
        return current.filter((value) => value !== item);
      if (current.length >= 5) return current;
      setMood(item);
      return [...current, item];
    });
  }

  function instantItinerary(variant: number, seed: number, random = false) {
    const choices = random ? [] : selectedMoods;
    const drinkPreferences = choices.filter((item) => ["Cocktails", "Wine bars", "Breweries", "Sports bars", "Speakeasies", "Rooftop bars", "Lounges"].includes(item));
    const drinkPreference = drinkPreferences.length ? drinkPreferences[variant % drinkPreferences.length] : undefined;
    const wantsDinner = choices.some((item) => ["Dinner", "Appetizers"].includes(item));
    const wantsDrinks = choices.some((item) => ["Cocktails", "Wine bars", "Breweries", "Sports bars", "Speakeasies", "Rooftop bars", "Lounges", "Nightlife"].includes(item));
    const wantsEvent = choices.some((item) => ["Live music", "Local bands", "Open mic", "Comedy", "Theater"].includes(item));
    const wantsActivity = choices.some((item) => ["Art events", "Museums with evening hours", "Activities", "Dancing"].includes(item));
    const categories: CatalogItem["category"][] = [
      ...(wantsDinner ? ["dinner" as const] : []),
      ...(wantsEvent ? [choices.includes("Comedy") ? "comedy" as const : "live_music" as const] : wantsActivity ? ["activity" as const] : []),
      ...(wantsDrinks ? ["drinks" as const] : []),
    ];
    const fallback = categories.length ? categories : ["dinner" as const, "drinks" as const];
    return fallback.flatMap((category, index) => {
      const base = bostonCatalog.filter((item) => item.category === category);
      const options = category === "drinks" && drinkPreference ? base.filter((item) => item.tags?.includes(drinkPreference)).length ? base.filter((item) => item.tags?.includes(drinkPreference)) : base : base;
      const selected = options[(seed + variant + index) % options.length];
      if (!selected) return [];
      const start = index === 0 ? "1830" : index === 1 ? "2030" : "2200";
      return [{ ...selected, start }];
    });
  }

  async function generate(random = false) {
    setLoading(true);
    setError("");
    setPlannerPicks((current) => randomPlannerPicks(current));
    const randomStart = Math.floor(Math.random() * moods.length);
    const generationSeed = Math.floor(Math.random() * 1_000_000);
    const immediateOptions = [0, 1, 2].map((variant) => instantItinerary(variant, generationSeed, random));
    setItineraryOptions(immediateOptions);
    setActiveOption(0);
    setItinerary(immediateOptions[0]);
    sessionStorage.setItem("aftersix-itinerary", JSON.stringify(immediateOptions[0]));
    setPlanned(true);
    try {
      const options = await Promise.all(
        [0, 1, 2].map(async (variant) => {
          const response = await fetch("/api/itineraries/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mood: random ? moods[(randomStart + variant) % moods.length] : selectedMoods.at(-1) ?? mood,
              moods: random ? [] : selectedMoods,
              food,
              transport,
              budget: budgetRanges[budgetIndex],
              payer,
  date: nightDate,
  startTime,
  variant,
              seed: generationSeed,
              excludeIds: [...recentVenueIds, ...itineraryOptions.flat().map((item) => item.id)],
  random,
            }),
          });
          if (!response.ok) throw new Error("Unable to build your night");
          return ((await response.json()) as { itinerary: CatalogItem[] })
            .itinerary;
        }),
      );
      setItineraryOptions(options);
      rememberVenues(options);
      setActiveOption(0);
      setItinerary(options[0]);
      sessionStorage.setItem(
        "aftersix-itinerary",
        JSON.stringify(options[0]),
      );
      setPlanned(true);
    } catch {
      setError("Couldn’t build your night. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const shouldBuildSurprise = plannerOnly && new URLSearchParams(window.location.search).get("random") === "1";
    if (shouldBuildSurprise && !autoBuildStarted.current) {
      autoBuildStarted.current = true;
      void generate(true);
    }
  }, [plannerOnly]);

  function chooseOption(index: number) {
    const nextItinerary = itineraryOptions[index];
    if (!nextItinerary) return;
    setActiveOption(index);
    setItinerary(nextItinerary);
    sessionStorage.setItem("aftersix-itinerary", JSON.stringify(nextItinerary));
  }

  async function regenerateStop(index: number) {
    const target = itinerary[index];
    if (!target) return;
    setRegeneratingStop(target.id);
    try {
      const response = await fetch("/api/itineraries/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood: selectedMoods.at(-1) ?? mood, moods: selectedMoods, food, transport, budget: budgetRanges[budgetIndex], payer, date: nightDate, startTime, variant: activeOption, seed: Math.floor(Math.random() * 1_000_000), excludeIds: [target.id] }),
      });
      if (!response.ok) throw new Error();
      const fresh = ((await response.json()) as { itinerary: CatalogItem[] }).itinerary;
      const replacement = fresh.find((item) => item.category === target.category) ?? fresh[index];
      if (!replacement) return;
      const next = itinerary.map((item, itemIndex) => itemIndex === index ? replacement : item);
      setItinerary(next);
      setItineraryOptions((current) => current.map((option, optionIndex) => optionIndex === activeOption ? next : option));
      rememberVenues([next]);
      sessionStorage.setItem("aftersix-itinerary", JSON.stringify(next));
    } finally { setRegeneratingStop(null); }
  }

  if (planned)
    return (
      <main className="results">
        <Nav showMap stops={itinerary} />
        <section className="route">
          <div className="heading">
            <div>
              <p className="kicker dark">
                <Sparkles size={13} /> Your {mood.toLowerCase()} route
              </p>
              <h2>Tonight, mapped out.</h2>
            </div>
          </div>
          <div className="route-tools">
            <WeatherChip />
            <button className="edit-plan" onClick={() => void saveNight()}>{savedNight ? "Saved" : saveMessage || "Save night"}</button>
            <button className="edit-plan" onClick={() => void shareNight()}>{savedNight ? "Share night" : "Save to share"}</button>
            {savedNight && <button className="edit-plan" onClick={() => void finalizeNight()}>Finalize option</button>}
            <button className="edit-plan" onClick={() => setPlanned(false)}>
              <ArrowLeft size={14} /> Edit preferences
            </button>
          </div>
          <div className={`itinerary-stack itinerary-stack--${itinerary.length}`}>
            <OptionStack
              options={itineraryOptions}
              activeOption={activeOption}
              onChoose={chooseOption}
            />
            <div className="route-card">
              <header>
              <div>
                <span className="option-label">
                  Option {String.fromCharCode(65 + activeOption)}
                </span>
                <small>Saturday night</small>
                <h3>
                  Moonlit
                  <br />
                  Boston
                </h3>
              </div>
              <div className="total">
                <small>{payer === "Split evenly" ? "BUDGET · EACH" : "TOTAL BUDGET"}</small>
                <b>{budgetRanges[budgetIndex]}</b>
                <small className="per-person">Per person</small>
                <span>
                  {payer} · {transport}
                </span>
              </div>
              </header>
              {alcoholFocused && transport !== "Rideshare" && <p className="route-advisory">🍸 Consider rideshare for this itinerary.</p>}
              <div className="stops">
                {itinerary.map((item, index) => (
                  <div key={item.id}>
                    <Stop
                    icon={
                      item.category === "dinner" ? (
                        <Utensils size={17} />
                      ) : item.category === "drinks" ? (
                        <Wine size={17} />
                      ) : (
                        <Ticket size={17} />
                      )
                    }
                    time={item.start.slice(0, 2) + ":" + item.start.slice(2)}
                    title={item.name}
                    type={`${item.description} · ${item.neighborhood}`}
                    imageUrl={item.imageUrl}
                    sourceUrl={item.sourceUrl}
                    eventTiming={
                      item.arrivalTime && item.endTime
                        ? { arrivalTime: item.arrivalTime, endTime: item.endTime }
                        : undefined
                    }
                    bookingStatus={item.bookingStatus}
                    availabilityNote={item.availabilityNote}
                    feedback={feedback[item.id]}
                    onFeedback={(action) => recordFeedback(item.id, action)}
                    onRegenerate={() => void regenerateStop(index)}
                    regenerating={regeneratingStop === item.id}
                    action={
                      item.bookingStatus.includes("ticket")
                        ? "Tickets"
                        : item.category === "dinner" ? "Reserve" : "Details"
                    }
                    />
                    {index < itinerary.length - 1 && <Leg from={item} to={itinerary[index + 1]} transport={transport} />}
                  </div>
                ))}
                {itinerary.length > 0 && <Leg from={itinerary[itinerary.length - 1]} transport={transport} home />}
              </div>
              <p className="note">
                ✦ Built from the afterSix Boston catalog around your selected
                mood.
              </p>
            </div>
          </div>
        </section>
      </main>
    );

  return (
    <main className={plannerOnly ? "planner-only" : howOnly ? "how-only" : "landing-only"}>
      <Nav />
      <section className="hero" id="top">
        <span className="orb a" />
        <span className="orb b" />
        <div className="hero-stage">
        <div className="copy">
          <p className="kicker">
            <Sparkles size={13} /> Greater Boston · tonight
          </p>
          <h1>
            Go out.
            <br />
            <em>Feel</em> more.
          </h1>
          <p>
            An evening planner for the nights you&apos;ll talk about tomorrow.
          </p>
          <a className="hero-build" href="/planner">Build your night <ArrowUpRight size={18} /></a>
        </div>
        <div className="hero-discover" id="discover">
          <p className="kicker"><Sparkles size={13} /> What&apos;s happening</p>
          <h2>The night is already<br /><em>in motion.</em></h2>
          <p>Start with something happening nearby. We&apos;ll build the rest around it.</p>
          <div className="hero-discovery-grid">
            {discoveries.map(([number, label, mark]) => (
              <article key={label}><span>{mark}</span><b>{number}</b><small>{label}</small></article>
            ))}
          </div>
          <a className="hero-explore" href="/explore">Explore tonight <Search size={15} /></a>
        </div>
        </div>
        <footer className="hero-footer">
          <span>Curated for the way you want to feel.</span>
          <span>Start planning ↓</span>
        </footer>
      </section>
        <section className="planner-page" id="build">
        <div className="planner-layout">
        <div className="planner">
          <header>
            <b>Build your night</b>
            <small>{selectedMoods.length} / 5</small>
          </header>
          <div className="quick">
            <Field icon={<MapPin size={16} />} top="Where" text="Boston, MA" hideChevron />
            <label className="quick-input">
              <CalendarDays size={16} />
              <span><small>When</small><input aria-label="Choose date" type="date" value={nightDate} onChange={(event) => setNightDate(event.target.value)} /></span>
            </label>
            <label className="quick-input">
              <Clock3 size={16} />
              <span><small>Time</small><input aria-label="Choose start time" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></span>
            </label>
          </div>
          <label className="label">Choose up to 5 options</label>
          <div className="moods">
            {moods.map((item) => (
              <button
                onClick={() => toggleMood(item)}
                className={
                  selectedMoods.includes(item) ? "active multi-selected" : ""
                }
                disabled={
                  selectedMoods.length >= 5 && !selectedMoods.includes(item)
                }
                key={item}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="selects">
            {needsFood && (
              <label>
                Food
                <select value={food} onChange={(e) => setFood(e.target.value)}>
                  <option>Any cuisine</option>
                  <option>Italian</option>
                  <option>Japanese & sushi</option>
                  <option>Mexican</option>
                  <option>Pizza</option>
                  <option>American</option>
                  <option>Vegetarian-friendly</option>
                  <option>Late-night food</option>
                  <option>Casual</option>
                  <option>Upscale</option>
                </select>
              </label>
            )}
            <label>
              Getting around
              <select
                value={transport}
                onChange={(e) => setTransport(e.target.value)}
              >
                <option>Rideshare</option>
                <option>Walking</option>
                <option>Driving</option>
                <option>Public transit</option>
              </select>
            </label>
          </div>
          <div className="budget">
            <div className="budget-heading">
              <span>💰 Total budget</span>
              <b>{budgetRanges[budgetIndex]}</b>
            </div>
            <small>Per person</small>
            <input
              aria-label="Budget per person"
              type="range"
              min="0"
              max={budgetRanges.length - 1}
              step="1"
              value={budgetIndex}
              onChange={(event) => setBudgetIndex(Number(event.target.value))}
            />
            <div className="budget-scale">
              <span>Under $30</span><span>$150+</span>
            </div>
            <div className="payer">
              <span>Who&apos;s paying?</span>
              {["Split evenly", "I'm paying"].map((option) => (
                <button
                  key={option}
                  onClick={() => setPayer(option)}
                  className={payer === option ? "active" : ""}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <button className="cta" onClick={() => void generate()} disabled={loading}>
            {loading ? "Building your night…" : "Plan my night"}{" "}
            <ArrowUpRight size={17} />
          </button>
          {error && <p className="error-message">{error}</p>}
        </div>
        <aside className="planner-picks" aria-label="Boston spots to explore">
          <p>Boston after dark</p>
          <div className="planner-pick-grid">
            {plannerPicks.map(([name, neighborhood, image]) => (
              <article className="planner-pick" key={name} style={{ backgroundImage: `url(${image})` }}>
                <span>{neighborhood}</span>
                <b>{name}</b>
              </article>
            ))}
          </div>
        </aside>
        </div>
        </section>
      <Explore />
    </main>
  );
}
function OptionStack({
  options,
  activeOption,
  onChoose,
}: {
  options: CatalogItem[][];
  activeOption: number;
  onChoose: (index: number) => void;
}) {
  return (
    <div className="option-stack" aria-label="Itinerary options">
      {options.filter((_, index) => index !== activeOption).map((option, position) => {
        const index = options.indexOf(option);
        return (
          <button
            className={`option-card option-card-${position}`}
            key={`option-${index}`}
            onClick={() => onChoose(index)}
            aria-pressed={index === activeOption}
          >
            <span>Option {String.fromCharCode(65 + index)}</span>
            <b>{String.fromCharCode(65 + index)}</b>
          </button>
        );
      })}
    </div>
  );
}
function Nav({ showMap = false, stops }: { showMap?: boolean; stops?: CatalogItem[] }) {
  return (
    <>
      {showMap && <MapMount stops={stops} />}
      <nav>
        <a className="logo" href="/">
          <span>afterSix</span>
          <small>A Ben Rapoza Product. (v1.0.0)</small>
        </a>
        <div>
          <a href="#discover">Discover</a>
          <a href="/how">How it works</a>
          <Show when="signed-out"><SignInButton><button>Sign in <ArrowUpRight size={14} /></button></SignInButton></Show>
          <Show when="signed-in"><a className="profile-link" href="/profile">Profile <ArrowUpRight size={14} /></a><UserButton /></Show>
        </div>
      </nav>
    </>
  );
}
function WeatherChip() {
  const [weather, setWeather] = useState<{ temperature: number; description: string; emoji: string } | null>(null);
  useEffect(() => {
    void fetch("/api/weather").then((response) => response.ok ? response.json() : null).then(setWeather).catch(() => setWeather(null));
  }, []);
  return <span className="weather-chip" title={weather?.description ?? "Boston weather"}>{weather ? `${weather.emoji} ${weather.temperature}°F` : "☀️"}</span>;
}
function Field({
  icon,
  top,
  text,
  hideChevron = false,
}: {
  icon: React.ReactNode;
  top: string;
  text: string;
  hideChevron?: boolean;
}) {
  return (
    <button>
      {icon}
      <span>
        <small>{top}</small>
        {text}
      </span>
      {!hideChevron && <ChevronDown size={14} />}
    </button>
  );
}
function Stop({
  icon,
  time,
  title,
  type,
  imageUrl,
  sourceUrl,
  eventTiming,
  bookingStatus,
  action,
  availabilityNote,
  feedback,
  onFeedback,
  onRegenerate,
  regenerating,
}: {
  icon: React.ReactNode;
  time: string;
  title: string;
  type: string;
  imageUrl?: string;
  sourceUrl: string;
  eventTiming?: { arrivalTime: string; endTime: string };
  bookingStatus: CatalogItem["bookingStatus"];
  action: string;
  availabilityNote?: string;
  feedback?: "saved" | "skipped" | "more";
  onFeedback: (action: "saved" | "skipped" | "more") => void;
  onRegenerate: () => void;
  regenerating: boolean;
}) {
  const reservationSearch = `https://www.opentable.com/s?term=${encodeURIComponent(`${title} Boston`)}`;
  const href = action === "Reserve" ? reservationSearch : sourceUrl || venueUrls[title];
  const formatTime = (value: string) => {
    const digits = value.replace(/\D/g, "").padStart(4, "0");
    const hour = Number(digits.slice(0, 2));
    const minute = digits.slice(2, 4);
    return `${((hour + 11) % 12) + 1}:${minute} ${hour >= 12 ? "PM" : "AM"}`;
  };
  const [displayTime, period] = formatTime(time).split(" ");
  return (
    <div className="stop">
      <div className="time">
        {displayTime}
        <small>{period}</small>
      </div>
      <div className="stop-icon">{icon}</div>
      <div className="stop-content">
        <div className="stop-title"><h4>{title}</h4></div>
        <p>{type}</p>
        {eventTiming && <p className="event-timing">Arrive by {formatTime(eventTiming.arrivalTime)} · Show {formatTime(time)} · Ends ~{formatTime(eventTiming.endTime)}</p>}
        <StatusBadge status={bookingStatus} />
        {availabilityNote && <p className="availability-note">◷ {availabilityNote}</p>}
        <div className="stop-feedback">
          <button className={feedback === "saved" ? "active" : ""} onClick={() => onFeedback("saved")}>Save</button>
          <button onClick={onRegenerate} disabled={regenerating}>{regenerating ? "Refreshing…" : "Try another"}</button>
        </div>
      </div>
      <div className="stop-actions">
        <VenuePhoto imageUrl={imageUrl} sourceUrl={sourceUrl} title={title} />
        <a className="venue-link" href={href} target="_blank" rel="noreferrer">
          {action} <ArrowUpRight size={13} />
        </a>
      </div>
    </div>
  );
}
function VenuePhoto({ imageUrl, sourceUrl, title }: { imageUrl?: string; sourceUrl: string; title: string }) {
  const [failed, setFailed] = useState(false);
  const fallback = `/api/venue-image?title=${encodeURIComponent(title)}&url=${encodeURIComponent(sourceUrl)}`;
  const src = failed ? undefined : imageUrl ?? fallback;
  return src ? <img className="stop-photo" src={src} alt={`${title} venue`} width="176" height="132" loading="eager" decoding="async" fetchPriority="high" onError={() => setFailed(true)} /> : <div className="stop-photo stop-photo--unavailable" aria-label="Verified venue photo unavailable">{title.slice(0, 1)}</div>;
}
function StatusBadge({ status }: { status: CatalogItem["bookingStatus"] }) {
  const labels: Record<CatalogItem["bookingStatus"], string> = {
    not_needed: "🟢 No reservation needed",
    recommended: "🟡 Reservation recommended",
    required: "🔴 Reservation required",
    ticket_required: "🎟️ Ticket required",
    limited_availability: "⚠️ Limited availability",
  };
  return <span className={`reservation-badge ${status}`}>{labels[status]}</span>;
}
function Leg({ from, to, transport, home = false }: { from: CatalogItem; to?: CatalogItem; transport: string; home?: boolean }) {
  const links = transportationLinks(transport as TransportationChoice, from, to);
  const estimate = from.travelToNext ? `${from.travelToNext.distanceMiles} mi · ~${from.travelToNext.minutes} min` : transportationEstimate(transport as TransportationChoice, from, to);
  const travelLabel = transport === "Rideshare" ? "🚕 Rideshare" : transport === "Walking" ? "🚶 Walk" : transport === "Public transit" ? "🚌 Transit" : "🚗 Drive";
  return <div className="leg rideshare-leg"><span>{home ? `🏠 ${estimate}` : `${travelLabel} · ${estimate}`}</span><div>{links.map((link) => <a key={link.label} href={link.url} target="_blank" rel="noreferrer">{link.label}</a>)}</div></div>;
}
function Explore() {
  return (
    <>
      <section className="how" id="how">
        <p className="kicker dark">How afterSix works</p>
        <h2>
          Less research.
          <br />
          More <em>magic.</em>
        </h2>
        <div className="steps">
          <article>
            <b>01</b>
            <h3>Set the mood</h3>
            <p>Share what sounds good, not a spreadsheet of decisions.</p>
          </article>
          <article>
            <b>02</b>
            <h3>See what fits</h3>
            <p>We match real events and great places to your evening.</p>
          </article>
          <article>
            <b>03</b>
            <h3>Just go</h3>
            <p>Book, ride, and follow the night as it unfolds.</p>
          </article>
        </div>
      </section>
      <section className="discover" id="discover">
        <div>
          <p className="kicker">
            <Sparkles size={13} /> What&apos;s happening
          </p>
          <h2>
            The night is
            <br />
            <em>already in motion.</em>
          </h2>
          <p>
            Start with something happening nearby. We&apos;ll build the rest
            around it.
          </p>
          <a className="outline" href="/explore">
            Explore tonight <Search size={15} />
          </a>
        </div>
        <div className="tiles">
          {discoveries.map(([number, label, mark], index) => (
            <article className={`tile t${index}`} key={label}>
              <span>{mark}</span>
              <b>{number}</b>
              <p>{label}</p>
              <ArrowUpRight size={17} />
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
