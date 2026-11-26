import type { DefinicionCompetencia } from "./index";

// Morning team's template (Equipo 5, plantillas_dia/"Herramienta 4 - Indicadores
// - Orientación a resultados.xlsx", PRD Appendix A.5) with only the minimal
// corrections listed there. Keep it verbatim: it is also the rubric sent to Jev.
// The v1.22 file carries the same text as the former "Plantilla Sistematizada
// Orientación a resultados.xlsx".
// The night rubric is the night team's own template (Equipo 5,
// plantillas_noche/"Herramienta 4 Orientación a resultados.xlsx", PRD Appendix A.10),
// with its own indicator ids ("…-noche-N").
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
    noche: {
      definicion:
        "Es la capacidad de establecer objetivos alineados con las metas organizacionales, priorizar actividades, administrar eficientemente los recursos y ejecutar acciones que permitan alcanzar los resultados esperados dentro de los plazos establecidos, dando seguimiento al desempeño y realizando ajustes cuando sea necesario para mantener la calidad del trabajo.\nEs la capacidad de dirigir los esfuerzos hacia el cumplimiento eficiente de resultados medibles, alineados con los objetivos organizacionales, aprovechando adecuadamente los recursos y dando seguimiento al logro de las metas.",
      fuente: "Office of Personnel Management [OPM], s. f.; California Department of Human Resources [CalHR], 2023",
      indicadores: [
        {
          id: "orientacion-resultados-noche-1",
          numero: 1,
          titulo: "Establece acciones y metas claras.",
          niveles: {
            1: "Cumple las metas indicadas para realizar sus tareas.",
            2: "Controla sus tareas según las metas establecidas.",
            3: "Coordina sus metas cuando cambian las prioridades.",
            4: "Desarrolla metas claras para mejorar la organización de su trabajo.",
          },
        },
        {
          id: "orientacion-resultados-noche-2",
          numero: 2,
          titulo: "Administra eficientemente los recursos disponibles asignados.",
          niveles: {
            1: "Identifica los recursos disponibles para realizar sus tareas.",
            2: "Gestiona de forma eficiente los recursos asignados.",
            3: "Optimiza de manera certera los recursos disponibles a las tareas asignadas.",
            4: "Perfecciona el uso de los recursos disponibles para superar el resultado.",
          },
        },
        {
          id: "orientacion-resultados-noche-3",
          numero: 3,
          titulo: "Verifica la calidad de su progreso de sus tareas.",
          niveles: {
            1: "Reconoce errores básicos en sus tareas.",
            2: "Verifica el avance y la calidad de sus tareas.",
            3: "Corrige errores para mejorar la calidad de su trabajo.",
            4: "Implementa mejoras para prevenir errores en sus tareas.",
          },
        },
        {
          id: "orientacion-resultados-noche-4",
          numero: 4,
          titulo: "Prioriza las metas establecidas.",
          niveles: {
            1: "Sigue el orden de prioridades para realizar sus tareas.",
            2: "Organiza sus tareas según las metas establecidas.",
            3: "Ajusta sus prioridades para cumplir las metas a tiempo.",
            4: "Promueve cambios en las prioridades para asegurar el cumplimiento de las metas.",
          },
        },
      ],
    },
  },
};
