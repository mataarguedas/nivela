"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { NIVELES } from "@/config/niveles";
import {
  COLOR_EJE,
  COLOR_REJILLA,
  HEX_NIVEL,
  TAMANO_ETIQUETA,
  TEXTO_SOBRE_NIVEL,
  type PuntoDistribucion,
} from "./datosGraficos";

// Stacked horizontal bars, one per indicator, one segment per level (PRD
// §11). "porcentaje" mode (Reporte general) stacks shares to 100 %; "conteo"
// mode (Reporte individual) stacks evaluator counts up to `maximo`. Values
// and labels come pre-formatted from the server; this only draws. Loaded
// through graficos.tsx (next/dynamic, ssr: false) so Recharts stays on the
// report routes.

type Props = { puntos: PuntoDistribucion[]; maximo: number };

export default function DistribucionNiveles({ puntos, maximo }: Props) {
  const datos = puntos.map((p) => ({
    eje: p.eje,
    ...Object.fromEntries(NIVELES.flatMap((n) => [[`v${n.valor}`, p.valores[n.valor]], [`t${n.valor}`, p.textos[n.valor]]])),
  }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={datos} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 0 }} accessibilityLayer={false}>
        <CartesianGrid horizontal={false} stroke={COLOR_REJILLA} />
        <XAxis type="number" domain={[0, maximo]} hide />
        <YAxis
          type="category"
          dataKey="eje"
          width={52}
          tickLine={false}
          axisLine={false}
          tick={{ fill: COLOR_EJE, fontSize: TAMANO_ETIQUETA }}
        />
        {NIVELES.map((n) => (
          <Bar key={n.valor} dataKey={`v${n.valor}`} stackId="niveles" fill={HEX_NIVEL[n.valor]} isAnimationActive={false}>
            <LabelList dataKey={`t${n.valor}`} position="center" fill={TEXTO_SOBRE_NIVEL[n.valor]} fontSize={TAMANO_ETIQUETA} />
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
