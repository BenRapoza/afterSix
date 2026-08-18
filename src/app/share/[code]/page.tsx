"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Stop = { id: string; name: string };
type Night = { title: string; itinerary: Stop[]; selected_option: number; is_finalized: boolean };
const voterKey = () => { const key = "aftersix-voter-key"; const existing = localStorage.getItem(key); if (existing) return existing; const created = crypto.randomUUID(); localStorage.setItem(key, created); return created; };

export default function SharedNight({ params }: { params: Promise<{ code: string }> }) {
  const [code, setCode] = useState(""); const [night, setNight] = useState<Night | null>(null); const [votes, setVotes] = useState([0, 0, 0]); const [message, setMessage] = useState("Loading shared night…");
  useEffect(() => { void params.then(({ code: value }) => setCode(value)); }, [params]);
  useEffect(() => { if (!code) return; void fetch(`/api/shared-nights/${code}`).then(async (response) => { const data = await response.json() as { night?: Night; votes?: number[]; error?: string }; if (!response.ok || !data.night) { setMessage(data.error ?? "Night unavailable"); return; } setNight(data.night); setVotes(data.votes ?? [0, 0, 0]); setMessage(""); }); }, [code]);
  async function vote(optionIndex: number) { const response = await fetch(`/api/shared-nights/${code}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "vote", optionIndex, voterKey: voterKey() }) }); if (!response.ok) { setMessage("Couldn’t save vote"); return; } const refreshed = await fetch(`/api/shared-nights/${code}`).then((result) => result.json()) as { votes?: number[] }; setVotes(refreshed.votes ?? votes); setMessage("Vote saved"); }
  if (!night) return <main className="shared-night"><Link href="/">afterSix</Link><p>{message}</p></main>;
  return <main className="shared-night"><nav><Link href="/">afterSix</Link><Link href="/planner">Build your own</Link></nav><section><p className="kicker dark">SHARED NIGHT</p><h1>{night.title}</h1><p>{night.is_finalized ? "This night is finalized." : "Vote together, then the host can finalize the plan."}</p><div className="shared-options">{[0, 1, 2].map((optionIndex) => <button key={optionIndex} className={night.selected_option === optionIndex ? "selected" : ""} onClick={() => void vote(optionIndex)}><strong>Option {String.fromCharCode(65 + optionIndex)}</strong><span>{votes[optionIndex] ?? 0} vote{votes[optionIndex] === 1 ? "" : "s"}</span><div>{(optionIndex === night.selected_option ? night.itinerary : night.itinerary.slice().reverse()).slice(0, 3).map((stop) => <p key={`${optionIndex}-${stop.id}`}>{stop.name}</p>)}</div><small>Vote for this option</small></button>)}</div><p>{message}</p></section></main>;
}
