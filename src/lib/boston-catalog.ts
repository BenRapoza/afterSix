export type CatalogItem = {
  id: string;
  name: string;
  neighborhood: string;
  category: "dinner" | "drinks" | "live_music" | "comedy" | "activity";
  start: string;
  durationMinutes: number;
  costPerPerson: number;
  bookingStatus: "not_needed" | "recommended" | "required" | "ticket_required" | "limited_availability";
  description: string;
  sourceUrl: string;
  availabilityUpdatedAt: string;
  availabilityNote?: string;
  latitude: number;
  longitude: number;
  arrivalTime?: string;
  doorsTime?: string;
  endTime?: string;
  imageUrl?: string;
  travelToNext?: { distanceMiles: number; minutes: number; mode: string };
};

// Starter data for the Boston prototype. Replace with licensed provider data before launch.
export const bostonCatalog: CatalogItem[] = [
  { id: "row-34-seaport", name: "Row 34", neighborhood: "Seaport", category: "dinner", start: "18:30", durationMinutes: 90, costPerPerson: 55, bookingStatus: "recommended", description: "Oyster bar and seafood dinner", sourceUrl: "https://www.row34.com/locations-and-reservations/", availabilityUpdatedAt: "unknown", latitude: 42.3512, longitude: -71.0479 },
  { id: "wallys-cafe", name: "Wally's Café Jazz Club", neighborhood: "South End", category: "live_music", start: "20:15", durationMinutes: 90, costPerPerson: 15, bookingStatus: "not_needed", description: "Live jazz; verify the nightly schedule", sourceUrl: "https://wallyscafe.com/visit-wallys/", availabilityUpdatedAt: "unknown", latitude: 42.3425, longitude: -71.0833 },
  { id: "drink-fort-point", name: "Drink", neighborhood: "Fort Point", category: "drinks", start: "21:55", durationMinutes: 60, costPerPerson: 28, bookingStatus: "not_needed", description: "Craft cocktails", sourceUrl: "https://www.drinkfortpoint.com/", availabilityUpdatedAt: "unknown", latitude: 42.3507, longitude: -71.0464 },
  { id: "yvonne-s", name: "Yvonne's", neighborhood: "Downtown Crossing", category: "dinner", start: "18:45", durationMinutes: 75, costPerPerson: 55, bookingStatus: "recommended", description: "Dinner and cocktails", sourceUrl: "https://www.yvonnesboston.com/", availabilityUpdatedAt: "unknown", latitude: 42.3554, longitude: -71.0607 },
  { id: "laugh-boston", name: "Laugh Boston", neighborhood: "Seaport", category: "comedy", start: "20:30", durationMinutes: 80, costPerPerson: 30, bookingStatus: "ticket_required", description: "Check the current show schedule", sourceUrl: "https://www.laughboston.com/", availabilityUpdatedAt: "unknown", latitude: 42.3509, longitude: -71.0460 },
  { id: "kings-seaport", name: "Kings Dining & Entertainment", neighborhood: "Seaport", category: "activity", start: "20:00", durationMinutes: 75, costPerPerson: 22, bookingStatus: "recommended", description: "Bowling, games, and food", sourceUrl: "https://www.kingsbowling.com/", availabilityUpdatedAt: "unknown", latitude: 42.3492, longitude: -71.0412 },
];
