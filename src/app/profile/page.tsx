"use client";

import { ArrowLeft, Heart, MapPin, Save, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import styles from "./profile.module.css";

type Profile = { name: string; neighborhood: string; dietary: string; transportation: string };

const initialProfile: Profile = { name: "", neighborhood: "Boston, MA", dietary: "No restrictions", transportation: "Rideshare" };

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [saved, setSaved] = useState<string[]>([]);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("aftersix-profile");
    const feedback = localStorage.getItem("aftersix-feedback");
    const synced = user?.unsafeMetadata.afterSixProfile;
    if (typeof synced === "object" && synced) setProfile({ ...initialProfile, ...(synced as Partial<Profile>) });
    else if (stored) setProfile({ ...initialProfile, ...JSON.parse(stored) });
    if (feedback) setSaved(Object.entries(JSON.parse(feedback) as Record<string, string>).filter(([, action]) => action === "saved").map(([id]) => id));
    if (user) {
      void fetch("/api/profile").then((response) => response.ok ? response.json() : null).then((data) => {
        if (data?.profile) setProfile({ name: data.profile.name ?? "", neighborhood: data.profile.home_base, dietary: data.profile.dietary_preferences, transportation: data.profile.transportation });
      });
      void fetch("/api/saved-nights").then((response) => response.ok ? response.json() : null).then((data) => { if (data?.nights) setSaved(data.nights.map((night: { id: string }) => night.id)); });
    }
  }, [user]);

  function update(field: keyof Profile, value: string) { setProfile((current) => ({ ...current, [field]: value })); }
  async function saveProfile() {
    localStorage.setItem("aftersix-profile", JSON.stringify(profile));
    if (user) await user.update({ unsafeMetadata: { ...user.unsafeMetadata, afterSixProfile: profile } });
    if (user) await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) });
    setComplete(true);
  }

  return <main className={styles.page}>
    <nav className={styles.nav}><a href="/"><ArrowLeft size={16} /> afterSix</a><span>A Ben Rapoza Product. (v1.0.0)</span></nav>
    <section className={styles.profile}>
      <header><p><Sparkles size={14} /> Your afterSix profile</p><h1>Make every night<br /><em>feel like you.</em></h1><span>{isLoaded && user ? `Signed in as ${user.firstName || user.primaryEmailAddress?.emailAddress || "you"}` : "Save preferences on this device."}</span></header>
      <div className={styles.grid}>
        <form onSubmit={(event) => { event.preventDefault(); saveProfile(); }}>
          <label>Your name<input value={profile.name} onChange={(event) => update("name", event.target.value)} placeholder="Your first name" /></label>
          <label><MapPin size={14} /> Home base<input value={profile.neighborhood} onChange={(event) => update("neighborhood", event.target.value)} /></label>
          <label>Dietary preferences<select value={profile.dietary} onChange={(event) => update("dietary", event.target.value)}><option>No restrictions</option><option>Vegetarian</option><option>Vegan</option><option>Gluten-free</option><option>Allergy-aware</option></select></label>
          <label>Default transportation<select value={profile.transportation} onChange={(event) => update("transportation", event.target.value)}><option>Rideshare</option><option>Walking</option><option>Driving</option><option>Public transit</option></select></label>
          <button type="submit"><Save size={15} /> {complete ? "Saved" : "Save profile"}</button>
        </form>
        <aside><Heart size={18} /><p>Saved places</p><b>{saved.length}</b><span>{saved.length ? "Places you saved from your nights" : "Save a stop on a generated night to see it here."}</span><a href="/planner">Build a night →</a></aside>
      </div>
    </section>
  </main>;
}
