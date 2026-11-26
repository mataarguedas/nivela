import type { DefinicionCompetencia } from "./index";

// Morning team's template (Equipo 2, plantillas_dia/"plantilla sistematizada_
// Regulación emocional.xlsx", PRD Appendix A.3) with only the minimal
// corrections listed there. Keep it verbatim: it is also the rubric sent to
// Jev. The v1.18 revision reworded one level under the same ids (PRD §9.1).
// The night rubric is the night team's own template (Equipo 2,
// plantillas_noche/"Plantilla_sistematizada Autoregulación emocional.xlsx", PRD Appendix A.8),
// with its own indicator ids ("…-noche-N").
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
            2: "Valora las circunstancias emocionalmente exigentes, pero necesita tiempo, orientación e instrucciones específicas para superarlas.",
            3: "Remodela el desafío como situaciones temporales y manejables, manteniendo la calma y actúa proactivamente.",
            4: "Afronta con resiliencia situaciones críticas e inesperadas, adaptando estrategias ante la adversidad y asegurando la continuidad de los procesos.",
          },
        },
      ],
    },
    noche: {
      definicion:
        "Capacidad de manejar las emociones de forma adecuada, comprendiendo la relación entre lo que se siente, se piensa y se hace, y utilizando recursos para afrontar situaciones difíciles.\nCapacidad de gestionar las emociones perturbadoras, evitar respuestas impulsivas y mantener un comportamiento eficaz bajo estrés.",
      fuente: "Guzmán Coyago, E. y Moreno, E. M., 2025; Goleman, D., 2024",
      indicadores: [
        {
          id: "autorregulacion-emocional-noche-1",
          numero: 1,
          titulo: "Autorregula sus emociones.",
          niveles: {
            1: "Reacciona emocionalmente sin lograr controlar sus respuestas.",
            2: "Reconoce sus emociones e intenta controlarlas, aunque de manera inconsistente.",
            3: "Controla sus emociones de forma consciente y mantiene una respuesta adecuada ante situaciones difíciles.",
            4: "Anticipa sus reacciones y mantiene un equilibrio emocional constante ante situaciones complejas.",
          },
        },
        {
          id: "autorregulacion-emocional-noche-2",
          numero: 2,
          titulo: "Expresa su desacuerdo.",
          niveles: {
            1: "Confronta de manera impulsiva o poco respetuosa al expresar desacuerdos.",
            2: "Reconoce su desacuerdo con respeto, aunque puede perder el control bajo presión.",
            3: "Expresa sus diferencias con respeto, escucha y sostiene un diálogo constructivo de forma autónoma.",
            4: "Promueve el diálogo constructivo y expresa sus diferencias de forma asertiva, favoreciendo la resolución de conflictos.",
          },
        },
        {
          id: "autorregulacion-emocional-noche-3",
          numero: 3,
          titulo: "Gestiona emociones perturbadoras bajo estrés.",
          niveles: {
            1: "Se deja dominar por el estrés, afectando su comportamiento y capacidad de respuesta.",
            2: "Identifica el estrés e intenta gestionarlo, aunque presenta dificultades para mantener el control.",
            3: "Gestiona el estrés de manera efectiva, manteniendo la concentración y el comportamiento adecuado.",
            4: "Domina sus respuestas emocionales ante situaciones de alta presión, adaptándose sin perder el enfoque.",
          },
        },
        {
          id: "autorregulacion-emocional-noche-4",
          numero: 4,
          titulo: "Recupera el control después de una tensión.",
          niveles: {
            1: "Permanece alterado o frustrado, afectando su desempeño después de una situación tensa.",
            2: "Retoma gradualmente el control, aunque necesita tiempo o apoyo para recuperar la estabilidad.",
            3: "Recupera la compostura y retoma la actividad de manera autónoma y constructiva.",
            4: "Restablece rápidamente su equilibrio, reorienta su conducta y continúa sin trasladar la tensión a otras situaciones.",
          },
        },
      ],
    },
  },
};
