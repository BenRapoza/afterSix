export type TransportationChoice =
  | "Rideshare"
  | "Walking"
  | "Driving"
  | "Public transit";

type Place = { latitude: number; longitude: number };
type TransportLink = { label: string; url: string };

export function transportationEstimate(
  choice: TransportationChoice,
  origin: Place,
  destination?: Place,
) {
  if (!destination) return "Head home when you’re ready";
  const radians = (value: number) => (value * Math.PI) / 180;
  const earthMiles = 3958.8;
  const lat = radians(destination.latitude - origin.latitude);
  const lng = radians(destination.longitude - origin.longitude);
  const a = Math.sin(lat / 2) ** 2 + Math.cos(radians(origin.latitude)) * Math.cos(radians(destination.latitude)) * Math.sin(lng / 2) ** 2;
  const miles = Math.max(.1, earthMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  const mph = choice === "Walking" ? 3 : choice === "Public transit" ? 14 : 20;
  const minutes = Math.max(choice === "Walking" ? 4 : 5, Math.round((miles / mph) * 60 + (choice === "Public transit" ? 7 : 2)));
  return `${miles.toFixed(1)} mi · ~${minutes} min`;
}

const coordinates = (place: Place) => `${place.latitude},${place.longitude}`;

export function transportationLinks(
  choice: TransportationChoice,
  origin: Place,
  destination?: Place,
): TransportLink[] {
  const from = coordinates(origin);
  const to = destination ? coordinates(destination) : "Home";
  const mapsUrl = (mode: "driving" | "walking" | "transit") =>
    `https://www.google.com/maps/dir/?api=1&origin=${from}&destination=${to}&travelmode=${mode}`;
  const appleMaps = `https://maps.apple.com/?saddr=${from}&daddr=${to}`;

  if (choice === "Rideshare" && destination) {
    return [
      { label: "Get Uber ↗", url: `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${destination.latitude}&dropoff[longitude]=${destination.longitude}` },
      { label: "Get Lyft ↗", url: `https://www.lyft.com/ride?id=lyft&destination[latitude]=${destination.latitude}&destination[longitude]=${destination.longitude}` },
    ];
  }
  if (choice === "Rideshare") {
    return [
      { label: "Open Uber ↗", url: "https://m.uber.com/ul/?action=setPickup&pickup=my_location" },
      { label: "Open Lyft ↗", url: "https://www.lyft.com/ride" },
    ];
  }
  if (choice === "Walking")
    return [{ label: "Open walking directions ↗", url: mapsUrl("walking") }, { label: "Apple Maps ↗", url: appleMaps }];
  if (choice === "Public transit")
    return [{ label: "Open transit directions ↗", url: mapsUrl("transit") }, { label: "Apple Maps ↗", url: appleMaps }];
  return [{ label: "Open directions ↗", url: mapsUrl("driving") }, { label: "Apple Maps ↗", url: appleMaps }];
}
