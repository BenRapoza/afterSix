"use client";

import { createPortal } from "react-dom";
import { useState } from "react";
import dynamic from "next/dynamic";
import type { CatalogItem } from "@/lib/boston-catalog";

const BostonMap = dynamic(() => import("./BostonMap"), { ssr: false });

const route: CatalogItem[] = [
  { id: "row-34", name: "Row 34", neighborhood: "Seaport", category: "dinner", start: "18:30", durationMinutes: 90, costPerPerson: 55, bookingStatus: "recommended", description: "Dinner", sourceUrl: "https://www.row34.com/locations-and-reservations/", availabilityUpdatedAt: "unknown", latitude: 42.3512, longitude: -71.0479 },
  { id: "wallys", name: "Wally's Café Jazz Club", neighborhood: "South End", category: "live_music", start: "20:15", durationMinutes: 90, costPerPerson: 15, bookingStatus: "not_needed", description: "Jazz", sourceUrl: "https://wallyscafe.com/visit-wallys/", availabilityUpdatedAt: "unknown", latitude: 42.3425, longitude: -71.0833 },
  { id: "drink", name: "Drink", neighborhood: "Fort Point", category: "drinks", start: "21:55", durationMinutes: 60, costPerPerson: 28, bookingStatus: "not_needed", description: "Cocktails", sourceUrl: "https://www.drinkfortpoint.com/", availabilityUpdatedAt: "unknown", latitude: 42.3507, longitude: -71.0464 },
];

export default function MapMount() {
  const [stops] = useState<CatalogItem[]>(() => {
    try {
      const saved = sessionStorage.getItem("aftersix-itinerary");
      return saved ? JSON.parse(saved) as CatalogItem[] : route;
    } catch {
      return route;
    }
  });
  return createPortal(<BostonMap stops={stops}/>, document.body);
}
