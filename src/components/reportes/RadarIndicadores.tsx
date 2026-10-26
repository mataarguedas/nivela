"use client";

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { COLOR_EJE, COLOR_REJILLA, COLOR_TEXTO, TAMANO_ETIQUETA, type PuntoRadar } from "./datosGraficos";

// Mean per indicator on a 1–4 radial scale (PRD §11.1). Each axis label
// carries the formatted mean, so the values are readable without hovering.
// Loaded through graficos.tsx.

const SERIE = "#0066cc";

export default function RadarIndicadores({ puntos }: { puntos: PuntoRadar[] }) {
  const datos = puntos.map((p) => ({ ...p, rotulo: `${p.eje}: ${p.texto}` }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={datos} outerRadius="68%" margin={{ top: 8, right: 24, bottom: 8, left: 24 }} accessibilityLayer={false}>
        <PolarGrid stroke={COLOR_REJILLA} />
        <PolarAngleAxis dataKey="rotulo" tick={{ fill: COLOR_TEXTO, fontSize: TAMANO_ETIQUETA }} />
        <PolarRadiusAxis
          domain={[0, 4]}
          ticks={[1, 2, 3, 4]}
          angle={90}
          axisLine={false}
          tick={{ fill: COLOR_EJE, fontSize: 10 }}
        />
        <Radar dataKey="media" stroke={SERIE} strokeWidth={2} fill={SERIE} fillOpacity={0.2} isAnimationActive={false} dot />
      </RadarChart>
    </ResponsiveContainer>
  );
}
