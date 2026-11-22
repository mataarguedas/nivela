import { describe, expect, it } from "vitest";
import { obtenerCompetencia } from "@/config/competencias";
import type { Equipo } from "@/config/equipos";
import { crearParticipante } from "@/config/participantes";
import { agregarReporte, agregarUsoAplicacion, estadoUso, type EntradaConsolidado, type FilaReporte } from "@/lib/reportes";

// "Uso de la aplicación" (PRD §11.6, v1.14): which evaluators activated their
// account and which are rating, over every team of the jornada, built on each
// competencia's "Avance de evaluadores". Team numbers and sizes are fixture
// values (the Pensamiento crítico team is "Equipo 1" with 3, Adaptabilidad
// "Equipo 4" with 3), never config's.
//
// 2 participants. Adaptabilidad: a1 active, sent P01 then P02 (later) → Completó;
// a2 pending (never activated) → Sin activar; a3 active, nothing → Sin evaluaciones.
// Pensamiento crítico: p1 active, sent P01 → Evaluando; p2 no account but has an
// evaluation (the docente can rate on someone's behalf) → still Sin activar;
// p3 active, marked both absent → Completó.

const CURSO = "AGRH 315 Psicología 2" as const;
const adaptabilidad = obtenerCompetencia("manana", "adaptabilidad")!;
const pensamiento = obtenerCompetencia("manana", "pensamiento-critico")!;
const participantes = [crearParticipante(1, "Tamara Prueba", "100000001"), crearParticipante(2, "Luis Prueba")];

const equipo = (competenciaId: string, numero: number, ids: string[]): Equipo => ({
  id: `equipo-${competenciaId}`,
  numero,
  jornada: "manana",
  competenciaId,
  integrantes: ids.map((id) => ({ id, nombre: `Persona ${id.toUpperCase()}`, curso: CURSO })),
});

function evaluacion(prefijo: string, evaluadorId: string, participanteId: string, actualizadoEn: string): FilaReporte[] {
  return [1, 2, 3, 4].map((n) => ({
    evaluadorId,
    participanteId,
    actualizadoEn,
    indicadorId: `${prefijo}-${n}`,
    nivel: 3,
    origen: "manual" as const,
    observacion: null,
    iaNivelSugerido: null,
    iaConfianza: null,
  }));
}

const T1 = "2026-11-18T14:00:00.000Z";
const T2 = "2026-11-19T16:30:00.000Z";

const ENTRADAS: EntradaConsolidado[] = [
  {
    id: "adaptabilidad",
    nombre: adaptabilidad.nombre,
    reporte: agregarReporte(
      adaptabilidad,
      equipo("adaptabilidad", 4, ["a1", "a2", "a3"]),
      participantes,
      [...evaluacion("adaptabilidad", "a1", "P01", T1), ...evaluacion("adaptabilidad", "a1", "P02", T2)],
      [],
      {
        a1: { estado: "activa", ultimoAcceso: T2, activadaEn: "2026-11-17T13:00:00.000Z" },
        a2: { estado: "pendiente", ultimoAcceso: null },
        a3: { estado: "activa", ultimoAcceso: T1, activadaEn: T1 },
      },
    ),
  },
  {
    id: "pensamiento-critico",
    nombre: pensamiento.nombre,
    reporte: agregarReporte(
      pensamiento,
      equipo("pensamiento-critico", 1, ["p1", "p2", "p3"]),
      participantes,
      [...evaluacion("pensamiento-critico", "p1", "P01", T1), ...evaluacion("pensamiento-critico", "p2", "P02", T1)],
      [
        { evaluadorId: "p3", participanteId: "P01" },
        { evaluadorId: "p3", participanteId: "P02" },
      ],
      { p1: { estado: "activa", ultimoAcceso: T1, activadaEn: T1 }, p3: { estado: "activa", ultimoAcceso: T1, activadaEn: T1 } },
    ),
  },
  { id: "orientacion-detalle", nombre: "Orientación al detalle", reporte: null },
];

describe("estadoUso", () => {
  const base = { enviadas: 0, ausentes: 0, estado: "sin-iniciar" as const };
  it("sin cuenta activa es «Sin activar», aunque tenga evaluaciones", () => {
    expect(estadoUso({ ...base, cuenta: "sin-correo" })).toBe("sin-activar");
    expect(estadoUso({ ...base, cuenta: "pendiente", enviadas: 3, estado: "en-progreso" })).toBe("sin-activar");
  });
  it("activa: sin evaluaciones, evaluando (envíos o ausencias) o completó", () => {
    expect(estadoUso({ ...base, cuenta: "activa" })).toBe("sin-actividad");
    expect(estadoUso({ ...base, cuenta: "activa", ausentes: 1 })).toBe("evaluando");
    expect(estadoUso({ ...base, cuenta: "activa", enviadas: 2, estado: "en-progreso" })).toBe("evaluando");
    expect(estadoUso({ ...base, cuenta: "activa", enviadas: 2, estado: "completo" })).toBe("completo");
  });
});

describe("agregarUsoAplicacion", () => {
  const uso = agregarUsoAplicacion(ENTRADAS);

  it("un equipo por competencia con plantilla, por número de equipo; los menos avanzados primero", () => {
    expect(uso.equipos.map((e) => [e.numeroEquipo, e.competenciaId])).toEqual([
      [1, "pensamiento-critico"],
      [4, "adaptabilidad"],
    ]);
    const [p, a] = uso.equipos;
    expect(p.evaluadores.map((e) => [e.evaluadorId, e.uso])).toEqual([
      ["p2", "sin-activar"],
      ["p1", "evaluando"],
      ["p3", "completo"],
    ]);
    expect(a.evaluadores.map((e) => [e.evaluadorId, e.uso])).toEqual([
      ["a2", "sin-activar"],
      ["a3", "sin-actividad"],
      ["a1", "completo"],
    ]);
    expect(p).toMatchObject({ total: 3, activadas: 2, conActividad: 3, completos: 1 });
    expect(a).toMatchObject({ total: 3, activadas: 2, conActividad: 1, completos: 1 });
  });

  it("activación, último ingreso y la última evaluación enviada de cada evaluador", () => {
    const a1 = uso.equipos[1].evaluadores.find((e) => e.evaluadorId === "a1")!;
    expect(a1).toMatchObject({ activadaEn: "2026-11-17T13:00:00.000Z", ultimoAcceso: T2, ultimoEnvio: T2, enviadas: 2, esperadas: 2 });
    const a3 = uso.equipos[1].evaluadores.find((e) => e.evaluadorId === "a3")!;
    expect(a3).toMatchObject({ activadaEn: T1, ultimoEnvio: null });
    const p2 = uso.equipos[0].evaluadores.find((e) => e.evaluadorId === "p2")!;
    expect(p2).toMatchObject({ cuenta: "sin-correo", activadaEn: null, ultimoAcceso: null, ultimoEnvio: T1 });
  });

  it("quiénes aún no activan, con su equipo, y los totales de la jornada", () => {
    expect(uso.sinActivar.map((e) => [e.evaluadorId, e.cuenta, e.numeroEquipo, e.competencia])).toEqual([
      ["p2", "sin-correo", 1, pensamiento.nombre],
      ["a2", "pendiente", 4, adaptabilidad.nombre],
    ]);
    expect(uso.kpis).toEqual({ total: 6, activadas: 4, pendientes: 1, sinCorreo: 1, conActividad: 4, completos: 2 });
  });

  it("nunca lleva correos; sin equipos queda vacío", () => {
    expect(JSON.stringify(uso)).not.toContain("@");
    expect(agregarUsoAplicacion([{ id: "orientacion-detalle", nombre: "Orientación al detalle", reporte: null }])).toEqual({
      equipos: [],
      sinActivar: [],
      kpis: { total: 0, activadas: 0, pendientes: 0, sinCorreo: 0, conActividad: 0, completos: 0 },
    });
  });
});
