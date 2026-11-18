"use client";

import dynamic from "next/dynamic";

// The only entry point to the Recharts components: the detailed charts under
// "Ver gráficos detallados" (PRD §11 v1.2). Each one is a separate client
// chunk loaded on first render (ssr: false), and GraficosDetallados renders
// them only once the docente opens the section, so Recharts never lands in
// a rating page's bundle, never runs on the server, and isn't downloaded for
// a report's default view (its simple charts are server-drawn HTML, see
// BarrasHorizontales). The parent figure reserves the chart's height, so
// nothing shifts when it arrives.

export const DistribucionNiveles = dynamic(() => import("./DistribucionNiveles"), { ssr: false });
export const RadarIndicadores = dynamic(() => import("./RadarIndicadores"), { ssr: false });
