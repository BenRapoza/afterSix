import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import "./images.css";
import "./map-view.css";
import "./type-scale.css";
import "./brand.css";
import "./venue-links.css";
import "./interactive-map.css";
import "./fullpage-sections.css";
import "./image-first-sections.css";
import "./white-landing.css";
import "./image-landing.css";
import "./site-white-cards.css";
import "./venue-gallery.css";
import "./landing-tweaks.css";
import "./people-nightlife.css";
import "./section-labels.css";
import "./brand-detail-tweaks.css";
import "./second-stop.css";

export const metadata: Metadata = {
  title: "afterSix — Date night, planned",
  description: "Beautifully planned nights out.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <ClerkProvider><html lang="en"><body>{children}<SpeedInsights /></body></html></ClerkProvider>;
}
