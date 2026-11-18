import type { DefinicionCompetencia } from "./index";

// Morning team's template (Equipo 5, "Plantilla Sistematizada Orientación a
// resultados.xlsx", PRD Appendix A.5) with only the minimal corrections listed
// there. Keep it verbatim: it is also the rubric sent to Jev. No night rubric
// yet: the night team (Equipo 5) hasn't sent its template, so the competencia
// shows "Próximamente" at night.
export const orientacionResultados: DefinicionCompetencia = {
  id: "orientacion-resultados",
  nombre: "Orientación a resultados",
  rubricas: {
    manana: {
      definicion:
        "La Orientación a Resultados es la capacidad, actitud y habilidad proactiva y persistente para encaminar las acciones al cumplimiento y superación de los objetivos o metas desafiantes. Implica la habilidad de planificar, priorizar, administrar eficazmente el tiempo y los recursos disponibles, demostrando resiliencia y adaptabilidad para superar obstáculos, evaluar riesgos y tomar decisiones pertinentes y acertadas enfocadas en el resultado final, todo ello bajo estándares de calidad, métricas e indicadores, con la finalidad de sostener e incrementar niveles altos de rendimiento e interés de la organización.",
      fuente: "Aicad Business School, 2023; Cursos 2CN, s. f.; UCC, Educación en USA",
      indicadores: [
        {
          id: "orientacion-resultados-1",
          numero: 1,
          titulo: "Planifica acciones hacia el cumplimiento de metas desafiantes y prioritarias.",
          niveles: {
            1: "Presenta dificultades para reconocer las necesidades y establecer prioridades.",
            2: "Reconoce las necesidades y prioridades, pero requiere orientación para definir acciones.",
            3: "Organiza acciones considerando las prioridades, necesidades y recursos disponibles.",
            4: "Planifica acciones y anticipa posibles obstáculos.",
          },
        },
        {
          id: "orientacion-resultados-2",
          numero: 2,
          titulo: "Distribuye el tiempo disponible y supera obstáculos de manera persistente.",
          niveles: {
            1: "Presenta dificultades para reconocer las tareas prioritarias y administrar el tiempo.",
            2: "Organiza el tiempo disponible según la importancia de las tareas.",
            3: "Administra el tiempo de manera autónoma y mantiene el esfuerzo ante las dificultades.",
            4: "Reorganiza el tiempo y adapta sus acciones ante obstáculos y cambios en las prioridades.",
          },
        },
        {
          id: "orientacion-resultados-3",
          numero: 3,
          titulo: "Propone alternativas de solución con niveles altos de rendimiento, ante discrepancias o errores.",
          niveles: {
            1: "Presenta dificultades para reconocer errores y plantear soluciones.",
            2: "Identifica errores y propone soluciones sencillas con orientación.",
            3: "Desarrolla alternativas de solución ante discrepancias o errores.",
            4: "Formula soluciones fundamentadas y anticipa sus posibles consecuencias.",
          },
        },
        {
          id: "orientacion-resultados-4",
          numero: 4,
          titulo: "Toma decisiones proactivas ante riesgos para alcanzar el resultado final con criterios de calidad.",
          niveles: {
            1: "Presenta dificultades para reconocer riesgos y requiere instrucciones para tomar decisiones.",
            2: "Identifica riesgos y propone acciones para responder ante situaciones conocidas, con orientación.",
            3: "Selecciona alternativas, considerando los posibles riesgos y criterios de calidad.",
            4: "Ejecuta acciones para mantener la calidad de los resultados.",
          },
        },
      ],
    },
  },
};
