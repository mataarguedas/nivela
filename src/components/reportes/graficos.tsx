"use client";

import dynamic from "next/dynamic";

// The only entry point to the Recharts components. Each one is a separate
// client chunk loaded after hydration (ssr: false), so Recharts never lands
// in a rating page's bundle and never runs on the server. The parent figure
// reserves the chart's height, so nothing shifts when it arrives.

export const DistribucionNiveles = dynamic(() => import("./DistribucionNiveles"), { ssr: false });
export const PuntajesParticipantes = dynamic(() => import("./PuntajesParticipantes"), { ssr: false });
export const RadarIndicadores = dynamic(() => import("./RadarIndicadores"), { ssr: false });
