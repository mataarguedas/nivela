// Anonymous evaluados (PRD §9.1). The count comes from CANTIDAD_PARTICIPANTES,
// which next.config.ts inlines at build time so server and client agree.
// Changing it requires a rebuild (a redeploy on Vercel).

export type Participante = {
  id: string;
  etiqueta: string;
};

export const CANTIDAD_PARTICIPANTES_PREDETERMINADA = 20;
const CANTIDAD_MAXIMA = 99; // ids are two digits: P01…P99

export function leerCantidadParticipantes(valor: string | undefined): number {
  if (valor === undefined || valor.trim() === "") return CANTIDAD_PARTICIPANTES_PREDETERMINADA;
  const cantidad = Number(valor);
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > CANTIDAD_MAXIMA) {
    throw new Error(
      `CANTIDAD_PARTICIPANTES must be an integer between 1 and ${CANTIDAD_MAXIMA}, got "${valor}".`,
    );
  }
  return cantidad;
}

export function generarParticipantes(cantidad: number): Participante[] {
  return Array.from({ length: cantidad }, (_, i) => {
    const numero = String(i + 1).padStart(2, "0");
    return { id: `P${numero}`, etiqueta: `Participante ${numero}` };
  });
}

// Must be a literal `process.env.X` access so the build can inline it.
export const PARTICIPANTES: readonly Participante[] = generarParticipantes(
  leerCantidadParticipantes(process.env.CANTIDAD_PARTICIPANTES),
);

export function obtenerParticipante(id: string): Participante | undefined {
  return PARTICIPANTES.find((p) => p.id === id);
}
