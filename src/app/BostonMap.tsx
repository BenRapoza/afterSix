"use client";

import "leaflet/dist/leaflet.css";
import { divIcon, latLngBounds } from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import { useEffect, useMemo } from "react";
import type { CatalogItem } from "@/lib/boston-catalog";

const townLabels = [
  ["Boston", 42.3601, -71.0589],
  ["Cambridge", 42.3736, -71.1097],
  ["Brookline", 42.3318, -71.1212],
  ["Chelsea", 42.3918, -71.0328],
] as const;
const townLabelAnchor = divIcon({ className: "town-label-anchor", html: "", iconSize: [1, 1], iconAnchor: [0, 0] });

function FitRoute({ positions, routeKey }: { positions: [number, number][]; routeKey: string }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 1) map.fitBounds(latLngBounds(positions), { padding: [88, 88], maxZoom: 14, animate: true });
    else if (positions[0]) map.setView(positions[0], 14, { animate: true });
  }, [map, routeKey]);
  return null;
}

export default function BostonMap({ stops }: { stops: CatalogItem[] }) {
  const positions = useMemo(() => stops.map((stop) => [stop.latitude, stop.longitude] as [number, number]), [stops]);
  const routeKey = stops.map((stop) => stop.id).join(":");
  const geoapifyKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
  const geoapifyTiles = geoapifyKey ? `https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}{r}.png?apiKey=${encodeURIComponent(geoapifyKey)}` : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
  return <div className="interactive-map"><MapContainer center={[42.354, -71.09]} zoom={12.5} zoomControl={false} scrollWheelZoom><FitRoute positions={positions} routeKey={routeKey} /><TileLayer attribution={geoapifyKey ? 'Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | © OpenStreetMap contributors' : "&copy; OpenStreetMap contributors &copy; CARTO"} url={geoapifyTiles} maxZoom={20}/>{townLabels.map(([name, latitude, longitude]) => <Marker key={name} position={[latitude, longitude]} icon={townLabelAnchor} interactive={false}><Tooltip permanent direction="center" className="town-label">{name}</Tooltip></Marker>)}{positions.length > 1 && <Polyline positions={positions} pathOptions={{ color: "#56b6e8", weight: 3, opacity: .85 }}/>} {stops.map((stop, index) => <Marker key={stop.id} position={[stop.latitude, stop.longitude]} icon={divIcon({ className: "route-pin", html: `<span>${index + 1}</span>`, iconSize: [32, 32], iconAnchor: [16, 16] })}><Popup><b>{index + 1}. {stop.name}</b><br/>{stop.neighborhood}<br/><a href={`https://www.google.com/maps/dir/?api=1&destination=${stop.latitude},${stop.longitude}`} target="_blank" rel="noreferrer">Directions ↗</a></Popup></Marker>)}</MapContainer></div>;
}
