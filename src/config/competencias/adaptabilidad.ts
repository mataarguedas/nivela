import type { Competencia } from "./index";

// Text from plantilla.xlsx ("Plantilla sistematizada", PRD Appendix A) with
// only the minimal corrections listed there. Keep it verbatim: it is also the
// rubric sent to Jev. Ids are positional (adaptabilidad-1 = Indicador 1); the
// v1.2 template reordered the indicators before any real evaluation existed.
export const adaptabilidad: Competencia = {
  id: "adaptabilidad",
  nombre: "Adaptabilidad",
  habilitada: true,
  definicion:
    "La adaptabilidad es la capacidad de modificar el propio comportamiento y responder de manera rápida y adecuada ante diferentes situaciones, personas y exigencias del entorno laboral, ajustándose a los cambios en los procedimientos, las tareas y las prioridades, y buscando soluciones eficaces ante los imprevistos.",
  fuente: "Govern de les Illes Balears, s. f.",
  indicadores: [
    {
      id: "adaptabilidad-1",
      numero: 1,
      titulo: "Actúa de manera rápida y flexible.",
      niveles: {
        1: "Reconoce los cambios, pero tarda en reaccionar y necesita instrucciones.",
        2: "Responde a cambios sencillos, siguiendo las indicaciones recibidas.",
        3: "Afronta cambios y mantiene la continuidad de sus tareas.",
        4: "Asume situaciones difíciles o inesperadas con rapidez y mantiene un buen desempeño.",
      },
    },
    {
      id: "adaptabilidad-2",
      numero: 2,
      titulo: "Modifica su forma de actuar ante cambios.",
      niveles: {
        1: "Mantiene su forma habitual de trabajar ante un cambio hasta recibir instrucciones.",
        2: "Acepta la manera de realizar una tarea siguiendo las indicaciones recibidas.",
        3: "Cambia su manera de trabajar ante nuevos procedimientos y los aplica constantemente, sin supervisión.",
        4: "Adapta sus métodos de trabajo a distintos escenarios y mantiene la calidad del resultado.",
      },
    },
    {
      id: "adaptabilidad-3",
      numero: 3,
      titulo: "Ajusta las prioridades ante las demandas del entorno.",
      niveles: {
        1: "Continúa con el orden de tareas establecido aunque surjan nuevas prioridades.",
        2: "Reordena sus tareas cuando se le indica cuáles deben atenderse primero.",
        3: "Realiza sus tareas según su urgencia e importancia sin requerir supervisión.",
        4: "Prioriza las tareas según su importancia y urgencia, incluso cuando surgen varias actividades al mismo tiempo.",
      },
    },
    {
      id: "adaptabilidad-4",
      numero: 4,
      titulo: "Propone soluciones eficaces ante imprevistos o exigencias, actuando con iniciativa.",
      niveles: {
        1: "Comunica el imprevisto y solicita apoyo para resolverlo.",
        2: "Plantea una alternativa sencilla con orientación de otra persona.",
        3: "Propone por iniciativa propia soluciones viables y las pone en práctica.",
        4: "Implementa la solución más eficaz y comprueba que el imprevisto haya sido resuelto.",
      },
    },
  ],
};
