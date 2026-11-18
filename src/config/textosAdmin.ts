import {
  CANTIDAD_MAXIMA_PARTICIPANTES,
  etiquetaNumero,
  LARGO_MAXIMO_CARNET,
  LARGO_MAXIMO_NOMBRE_PARTICIPANTE,
  numeroParticipante,
} from "./participantes";

// Spanish copy ("usted" form) for the admin's participant page and its API.
// Kept out of TEXTOS (src/config/textos.ts) because every client bundle
// imports that object, and these strings are only used on /admin.

const plural = (n: number, uno: string, varios: string) => (n === 1 ? `1 ${uno}` : `${n} ${varios}`);

export const TEXTOS_ADMIN = {
  titulo: "Participantes",
  descripcion:
    "Indique cuántas personas serán evaluadas y escriba su nombre y carné. Las personas evaluadoras verán los nombres; los reportes muestran solo el carné.",
  cantidad: "Cantidad de participantes",
  ayudaCantidad: `Un número entre 1 y ${CANTIDAD_MAXIMA_PARTICIPANTES}.`,
  nombres: "Nombres y carnés",
  ayudaNombres:
    "Escriba el nombre empezando por el nombre de pila, sin correos ni teléfonos. Si deja el nombre o el carné vacío, se mostrará «Participante 07» en su lugar.",
  participante: etiquetaNumero,
  nombre: "Nombre",
  carne: "Carné",
  carneDe: (numero: number) => `Carné · ${etiquetaNumero(numero)}`,
  pegarLista: "Pegar lista",
  pegarTitulo: "Pegar lista de participantes",
  pegarAyuda:
    "Una persona por línea: el carné y el nombre separados por una tabulación o por «;» (por ejemplo, copiados de una hoja de cálculo), o solo el nombre. La cantidad se ajusta al número de líneas.",
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
  carneInvalido: (numero: number) =>
    `Revise el carné del participante ${numeroParticipante(numero)}: solo números, letras o guiones, con un máximo de ${LARGO_MAXIMO_CARNET} caracteres.`,
  carneRepetido: (numero: number) => `El carné del participante ${numeroParticipante(numero)} ya está en la lista.`,
  listaInvalida: "Los datos de la lista de participantes no son válidos.",
} as const;

// "Cuentas de evaluadores" on /admin (PRD §5.12, Appendix C "Admin · cuentas").
export const TEXTOS_CUENTAS = {
  titulo: "Cuentas de evaluadores",
  descripcion:
    "Cada persona evaluadora ingresa con su correo. La primera vez recibe un código para crear su contraseña.",
  /** "Equipo 1 · Adaptabilidad": the number is this jornada's label for the team. */
  grupo: (numero: number, competencia: string) => `Equipo ${numero} · ${competencia}`,
  correo: "Correo electrónico",
  ultimoIngreso: "Último ingreso",
  nunca: "Nunca",
  estados: { "sin-correo": "Sin correo", pendiente: "Pendiente de activar", activa: "Activa" },
  editarCorreo: "Editar correo",
  agregarCorreo: "Agregar correo",
  editarTitulo: (nombre: string) => `Correo de ${nombre}`,
  editarAyuda: "Si cambia el correo, la cuenta vuelve a «Pendiente de activar». Déjelo vacío para quitarlo.",
  guardarCorreo: "Guardar correo",
  restablecer: "Restablecer acceso",
  restablecerTitulo: (nombre: string) => `¿Restablecer el acceso de ${nombre}?`,
  restablecerDescripcion:
    "Se borrará su contraseña. La próxima vez que ingrese recibirá un código en su correo para crear una nueva.",
  correoGuardado: "Correo guardado",
  accesoRestablecido: "Acceso restablecido",
  correoInvalido: "Ingrese un correo electrónico válido.",
  correoEnUso: "Ese correo ya está asignado a otra cuenta.",
  integranteInvalido: "Esa persona no pertenece a los equipos de esta jornada.",
  datosInvalidos: "Los datos de la cuenta no son válidos.",
  errorGuardar: "No se pudo guardar el cambio. Intente de nuevo.",
  errorCarga: "No se pudieron cargar las cuentas. Intente de nuevo.",
} as const;
