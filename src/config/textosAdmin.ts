import {
  CANTIDAD_MAXIMA_PARTICIPANTES,
  etiquetaNumero,
  LARGO_MAXIMO_NOMBRE_PARTICIPANTE,
  numeroParticipante,
} from "./participantes";

// Spanish copy ("usted" form) for the admin's participant page and its API.
// Kept out of TEXTOS (src/config/textos.ts) because every client bundle
// imports that object, and these strings are only used on /admin.

const plural = (n: number, uno: string, varios: string) => (n === 1 ? `1 ${uno}` : `${n} ${varios}`);

export const TEXTOS_ADMIN = {
  titulo: "Participantes",
  descripcion: "Indique cuántas personas serán evaluadas y escriba sus nombres. Las personas evaluadoras verán estos nombres.",
  cantidad: "Cantidad de participantes",
  ayudaCantidad: `Un número entre 1 y ${CANTIDAD_MAXIMA_PARTICIPANTES}.`,
  nombres: "Nombres",
  ayudaNombres: "Escriba solo el nombre, sin correos ni teléfonos. Si deja uno vacío, se mostrará como «Participante 07».",
  participante: etiquetaNumero,
  pegarLista: "Pegar lista",
  pegarTitulo: "Pegar lista de nombres",
  pegarAyuda: "Un nombre por línea. La cantidad se ajusta al número de líneas.",
  usarLista: "Usar esta lista",
  guardar: "Guardar cambios",
  guardando: "Guardando…",
  guardado: "Cambios guardados",
  resumen: (n: number) => plural(n, "participante", "participantes"),
  confirmarTitulo: "¿Ocultar participantes con evaluaciones?",
  confirmarDescripcion: (ocultos: number, evaluaciones: number) =>
    `Se ocultarán ${plural(ocultos, "participante", "participantes")} con ${plural(evaluaciones, "evaluación enviada", "evaluaciones enviadas")}. Las evaluaciones no se eliminan y vuelven a aparecer si aumenta la cantidad de nuevo.`,
  confirmar: "Ocultar y guardar",
  errorGuardar: "No se pudieron guardar los cambios. Intente de nuevo.",
  cantidadInvalida: `La cantidad de participantes debe ser un número entero entre 1 y ${CANTIDAD_MAXIMA_PARTICIPANTES}.`,
  nombreInvalido: (numero: number) =>
    `Revise el nombre del participante ${numeroParticipante(numero)}: escriba solo el nombre, sin correos ni teléfonos, con un máximo de ${LARGO_MAXIMO_NOMBRE_PARTICIPANTE} caracteres.`,
  listaInvalida: "Los datos de la lista de participantes no son válidos.",
} as const;
