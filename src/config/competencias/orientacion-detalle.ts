import type { DefinicionCompetencia } from "./index";

// Morning team's template (Equipo 3, plantillas_dia/"Plantilla Sistematizada-
// Equipo 5-Orientación al Detalle.xlsx", PRD Appendix A.4) with only the minimal
// corrections listed there. Keep it verbatim: it is also the rubric sent to Jev.
// The v1.22 revision rewrote every level description under the same ids
// (PRD §9.1).
// The night rubric is the night team's own template (Equipo 4,
// plantillas_noche/"Herramienta 4 - Plantilla Sistematizada Orientación al Detalle.xlsx", PRD Appendix A.9),
// with its own indicator ids ("…-noche-N").
export const orientacionDetalle: DefinicionCompetencia = {
  id: "orientacion-detalle",
  nombre: "Orientación al detalle",
  rubricas: {
    manana: {
      definicion:
        "La atención al detalle “es la capacidad de notar, procesar y completar con precisión todos los aspectos de una tarea sin omitir elementos pequeños pero significativos”. “Es la habilidad de procesar información detallada con efectividad y consistencia de manera minuciosa y exacta a partir de grandes volúmenes de información o datos”.\nConsiste en realizar una tarea con minuciosidad y precisión. Implica supervisar y verificar el trabajo o la información, así como planificar y organizar el tiempo y los recursos de manera eficiente.",
      fuente:
        "Bermúdez, N., 2023, párr. 1; Kim, K., 2026, párr. 1; Government of the Northwest Territories, s. f.; Syracuse University Performance Partnership, s. f.",
      indicadores: [
        {
          id: "orientacion-detalle-1",
          numero: 1,
          titulo: "Verifica aspectos minuciosos.",
          niveles: {
            1: "Observa los detalles más evidentes de una tarea.",
            2: "Localiza elementos pequeños que requieren mayor atención.",
            3: "Inspecciona cuidadosamente los distintos elementos, sin descuidar información importante.",
            4: "Comprueba aspectos poco perceptibles que podrían pasar desapercibidos para otras personas, manteniendo un alto nivel de precisión.",
          },
        },
        {
          id: "orientacion-detalle-2",
          numero: 2,
          titulo: "Comprueba cambios significativos.",
          niveles: {
            1: "Percibe modificaciones evidentes durante el desarrollo de una tarea.",
            2: "Distingue los cambios que se presentan en diferentes situaciones.",
            3: "Evalúa las modificaciones e identifica cuáles tienen mayor importancia.",
            4: "Analiza el impacto de los cambios y determina cuáles requieren mayor atención.",
          },
        },
        {
          id: "orientacion-detalle-3",
          numero: 3,
          titulo: "Organiza recursos correctos y completos.",
          niveles: {
            1: "Ordena los recursos disponibles siguiendo indicaciones generales.",
            2: "Selecciona los recursos necesarios para realizar una tarea de manera organizada.",
            3: "Distribuye los bloques conforme a las figuras y patrones de forma adecuada, asegurándose de que no falten elementos importantes.",
            4: "Optimiza la organización utilizando los bloques y identificando correctamente los colores, las figuras y los patrones, gestionando el tiempo de forma eficiente y anticipando posibles errores para completar la actividad con precisión y autonomía.",
          },
        },
        {
          id: "orientacion-detalle-4",
          numero: 4,
          titulo: "Controla cambios con precisión y exactitud.",
          niveles: {
            1: "Señala las modificaciones evidentes que se presentan durante una tarea.",
            2: "Registra los cambios realizados de manera ordenada y siguiendo las instrucciones.",
            3: "Ajusta los elementos necesarios ante una modificación, manteniendo la precisión de la tarea.",
            4: "Corrige las inconsistencias provocadas por los cambios y evita que afecten el resultado final.",
          },
        },
      ],
    },
    noche: {
      definicion:
        "“Es la habilidad para asegurar que el trabajo y la información, propios o ajenos, sean completos y precisos, además de prepararse cuidadosamente para reuniones y hacer seguimiento a otros, para asegurar que se hayan cumplido los acuerdos y compromisos”.\nEs la capacidad de ejecutar tareas con precisión y minuciosidad, identificando errores, verificando la exactitud de los datos y comprobando que la información y los procedimientos cumplan con los requisitos establecidos. Implica mantener la atención durante el desarrollo de las actividades y dar seguimiento a los compromisos para garantizar la calidad de los resultados.",
      fuente: "Biblioteca de Competencias, s. f.; adaptado de Compensar, s. f., y Dirección del Trabajo, s. f.",
      indicadores: [
        {
          id: "orientacion-detalle-noche-1",
          numero: 1,
          titulo: "Asegura que la información esté completa y precisa.",
          niveles: {
            1: "Completa la información solicitada en los documentos correspondientes.",
            2: "Revisa que los documentos contengan todos los datos requeridos.",
            3: "Comprueba que los datos coincidan con los documentos de respaldo.",
            4: "Verifica la integridad y exactitud de la información en los documentos antes de su entrega.",
          },
        },
        {
          id: "orientacion-detalle-noche-2",
          numero: 2,
          titulo: "Ejecuta tareas con precisión, minuciosidad e identificando errores.",
          niveles: {
            1: "Sigue instrucciones y presta atención a los detalles durante la ejecución de las tareas.",
            2: "Demuestra criterios de precisión y reconoce errores comunes en las tareas realizadas.",
            3: "Comprueba minuciosamente los resultados e identifica errores u omisiones.",
            4: "Garantiza la precisión en las tareas de distinta complejidad y detecta detalles poco evidentes.",
          },
        },
        {
          id: "orientacion-detalle-noche-3",
          numero: 3,
          titulo: "Verifica la exactitud de los datos.",
          niveles: {
            1: "Identifica errores evidentes en la información.",
            2: "Comprueba la información con diferentes fuentes disponibles.",
            3: "Reconoce errores muy complejos o poco evidentes en la información.",
            4: "Detecta inconsistencias de manera oportuna y propone solución al problema, evitando su recurrencia.",
          },
        },
        {
          id: "orientacion-detalle-noche-4",
          numero: 4,
          titulo: "Garantiza la calidad de los resultados.",
          niveles: {
            1: "Omite comprobar si su trabajo cumple con las instrucciones establecidas.",
            2: "Revisa parcialmente algunos requisitos, pero omite verificar otros.",
            3: "Verifica que su trabajo cumpla con las instrucciones y los requisitos establecidos.",
            4: "Asegura el cumplimiento de todos los requisitos y la corrección de incumplimientos antes de finalizar.",
          },
        },
      ],
    },
  },
};
