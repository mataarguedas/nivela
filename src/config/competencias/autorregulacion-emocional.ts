import type { DefinicionCompetencia } from "./index";

// Morning team's template (Equipo 2, "Plantilla sistematizada autorregulación
// emocional.xlsx", PRD Appendix A.3) with only the minimal corrections listed
// there. Keep it verbatim: it is also the rubric sent to Jev. No night rubric
// yet: the night team (Equipo 2) hasn't sent its template, so the competencia
// shows "Próximamente" at night.
export const autorregulacionEmocional: DefinicionCompetencia = {
  id: "autorregulacion-emocional",
  nombre: "Autorregulación emocional",
  rubricas: {
    manana: {
      definicion:
        "Se puede entender como autorregulación emocional a la capacidad de manejo óptimo de las emociones. Es decir, es un constructo englobado dentro de la inteligencia emocional intrapersonal que nos permite transformar una vivencia potencialmente estresante y emocionalmente alterante en algo que, aunque continúe siendo desagradable, comprendemos que es pasajero, impersonal y controlable. Los individuos con una elevada capacidad de autorregulación tienden a manejar de manera eficaz situaciones de alta exigencia emocional, minimizando el impacto negativo del estrés, y favoreciendo respuestas resilientes frente a los desafíos organizacionales.",
      fuente: "Montagud, 2020, párr. 1; Prado, 2025, p. 36",
      indicadores: [
        {
          id: "autorregulacion-emocional-1",
          numero: 1,
          titulo: "Canaliza lo que siente de forma positiva y responde con inteligencia emocional, a pesar de altibajos emocionales.",
          niveles: {
            1: "Presenta dificultades con conductas impulsivas o de alteración que generan tensión o presión.",
            2: "Intenta regular sus respuestas mediante pausas o reflexiones para moderar sus emociones ante situaciones exigentes.",
            3: "Identifica con rapidez y precisión sus emociones manteniendo una conducta constructiva ante los altibajos emocionales.",
            4: "Transforma situaciones de tensión en acciones constructivas que favorecen y se adapten.",
          },
        },
        {
          id: "autorregulacion-emocional-2",
          numero: 2,
          titulo: "Autorregula las emociones en situaciones difíciles, estresantes o perturbadoras.",
          niveles: {
            1: "Demuestra dificultades para autorregular sus emociones evidenciando comportamientos que afectan su desempeño.",
            2: "Aplica técnicas básicas para regular las emociones la mayor parte del tiempo.",
            3: "Conserva la calma ante situaciones estresantes, mostrando estabilidad emocional durante las circunstancias.",
            4: "Gestiona el equilibrio emocional ante situaciones estresantes o perturbadoras, manteniendo un comportamiento sereno.",
          },
        },
        {
          id: "autorregulacion-emocional-3",
          numero: 3,
          titulo: "Transforma una situación alterante y estresante, en un escenario momentáneo donde mantenga la calma, buscando soluciones asertivas.",
          niveles: {
            1: "Muestra dificultad para mantener la calma ante una situación estresante, por lo que requiere apoyo para enfrentarla.",
            2: "Reconoce las circunstancias estresantes, pero necesita tiempo para gestionarlas.",
            3: "Reinterpreta situaciones de alta tensión como circunstancias temporales y manejables, manteniendo la calma y propone soluciones efectivas.",
            4: "Modifica situaciones críticas e inesperadas en oportunidades de acción constructiva y promoviendo soluciones asertivas.",
          },
        },
        {
          id: "autorregulacion-emocional-4",
          numero: 4,
          titulo: "Maneja eficazmente situaciones de alta exigencia emocional respondiendo con resiliencia ante los desafíos.",
          niveles: {
            1: "Revela dificultades para gestionar sus emociones en situaciones de alta exigencia, afectando su desempeño.",
            2: "Valora las circunstancias emocionalmente exigentes, pero necesita tiempo, orientación e instrucciones específicas para la adaptación.",
            3: "Remodela el desafío como situaciones temporales y manejables, manteniendo la calma y actúa proactivamente.",
            4: "Afronta con resiliencia situaciones críticas e inesperadas, adaptando estrategias ante la adversidad y asegurando la continuidad de los procesos.",
          },
        },
      ],
    },
  },
};
