"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { COLOR_EJE, COLOR_REJILLA, COLOR_TEXTO, HEX_NIVEL, TAMANO_ETIQUETA, type PuntoPuntaje } from "./datosGraficos";

// "Puntaje por participante" (PRD §11.2): horizontal bars on the 0–4 scale,
// already sorted descending by the server, each filled with its nivel
// general's color and labelled with its score. Loaded through graficos.tsx.

export default function PuntajesParticipantes({ puntos }: { puntos: PuntoPuntaje[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={puntos} layout="vertical" margin={{ top: 4, right: 44, bottom: 4, left: 0 }} accessibilityLayer={false}>
        <CartesianGrid horizontal={false} stroke={COLOR_REJILLA} />
        <XAxis
          type="number"
          domain={[0, 4]}
          ticks={[0, 1, 2, 3, 4]}
          tickLine={false}
          axisLine={false}
          tick={{ fill: COLOR_EJE, fontSize: TAMANO_ETIQUETA }}
        />
        <YAxis
          type="category"
          dataKey="eje"
          width={40}
          interval={0}
          tickLine={false}
          axisLine={false}
          tick={{ fill: COLOR_EJE, fontSize: TAMANO_ETIQUETA }}
        />
        <Bar dataKey="puntaje" isAnimationActive={false} barSize={16}>
          {puntos.map((p) => (
            <Cell key={p.eje} fill={HEX_NIVEL[p.nivel]} />
          ))}
          <LabelList dataKey="texto" position="right" fill={COLOR_TEXTO} fontSize={TAMANO_ETIQUETA} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
