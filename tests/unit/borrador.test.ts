// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Borrador, EntradaParticipante } from "@/lib/borrador";

// borrador.ts keeps module-level state (mode, cache, pending writes), so each
// test imports a fresh copy.
async function cargar() {
  vi.resetModules();
  return import("@/lib/borrador");
}

const INDICADORES = ["i1", "i2", "i3", "i4"];

function entrada(niveles: (1 | 2 | 3 | 4 | undefined)[], extra: Partial<EntradaParticipante> = {}): EntradaParticipante {
  const calificaciones: EntradaParticipante["calificaciones"] = {};
  niveles.forEach((nivel, i) => {
    if (nivel !== undefined) calificaciones[INDICADORES[i]] = { nivel, origen: "manual" };
  });
  return { calificaciones, modificadoEn: "2026-10-25T10:00:00.000Z", ...extra };
}

function borradorCon(participantes: Borrador["participantes"]): Borrador {
  return { version: 1, participantes };
}

/** Makes every access to window.localStorage throw, like blocked storage. */
function bloquearLocalStorage() {
  const original = Object.getOwnPropertyDescriptor(window, "localStorage")!;
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    get() {
      throw new DOMException("The operation is insecure.", "SecurityError");
    },
  });
  return () => Object.defineProperty(window, "localStorage", original);
}

let restaurar: (() => void) | undefined;

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  restaurar?.();
  restaurar = undefined;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("claves", () => {
  it("sigue el esquema de PRD §9.3", async () => {
    const b = await cargar();
    expect(b.claveBorrador("adaptabilidad", "jimena-salgado")).toBe("nivela:v1:adaptabilidad:jimena-salgado");
    expect(b.claveEvaluador("adaptabilidad")).toBe("nivela:v1:evaluador:adaptabilidad");
  });
});

describe("migrarBorrador", () => {
  it("rechaza lo que no es un borrador utilizable", async () => {
    const { migrarBorrador } = await cargar();
    expect(migrarBorrador(null)).toBeNull();
    expect(migrarBorrador("texto")).toBeNull();
    expect(migrarBorrador([])).toBeNull();
    expect(migrarBorrador({ participantes: {} })).toBeNull();
    expect(migrarBorrador({ version: 0, participantes: {} })).toBeNull(); // no migration step
    expect(migrarBorrador({ version: 2, participantes: {} })).toBeNull(); // from a newer build
  });

  it("conserva las entradas válidas y descarta las mal formadas", async () => {
    const { migrarBorrador } = await cargar();
    const resultado = migrarBorrador({
      version: 1,
      participantes: {
        P01: {
          modificadoEn: "2026-10-25T10:00:00.000Z",
          enviadoEn: "no es fecha",
          calificaciones: {
            i1: { nivel: 3, observacion: "Reorganizó su agenda.", origen: "ia", ia: { nivelSugerido: 3, probabilidades: { "1": 0.1, "2": 0.1, "3": 0.7, "4": 0.1 }, confianza: 0.7, modelo: "jev-1.13.0" } },
            i2: { nivel: 7, origen: "otro" },
            i3: "basura",
          },
        },
        P02: { calificaciones: {} }, // no modificadoEn
        P03: "basura",
      },
    });
    expect(resultado).toEqual({
      version: 1,
      participantes: {
        P01: {
          modificadoEn: "2026-10-25T10:00:00.000Z",
          calificaciones: {
            i1: {
              nivel: 3,
              observacion: "Reorganizó su agenda.",
              origen: "ia",
              ia: { nivelSugerido: 3, probabilidades: { "1": 0.1, "2": 0.1, "3": 0.7, "4": 0.1 }, confianza: 0.7, modelo: "jev-1.13.0" },
            },
            i2: {},
          },
        },
      },
    });
  });
});

describe("estadoParticipante", () => {
  it("Pendiente, En progreso y Completado según los indicadores calificados", async () => {
    const { estadoParticipante } = await cargar();
    expect(estadoParticipante(undefined, INDICADORES)).toBe("pendiente");
    expect(estadoParticipante(entrada([]), INDICADORES)).toBe("pendiente");
    expect(estadoParticipante(entrada([2]), INDICADORES)).toBe("enProgreso");
    expect(estadoParticipante(entrada([2, 3, 1]), INDICADORES)).toBe("enProgreso");
    expect(estadoParticipante(entrada([2, 3, 1, 4]), INDICADORES)).toBe("completado");
  });

  it("una observación sin nivel no cuenta como calificado", async () => {
    const { estadoParticipante } = await cargar();
    const soloObservacion: EntradaParticipante = {
      calificaciones: { i1: { observacion: "Algo" } },
      modificadoEn: "2026-10-25T10:00:00.000Z",
    };
    expect(estadoParticipante(soloObservacion, INDICADORES)).toBe("pendiente");
  });

  it("Enviado cuando no hay cambios locales posteriores al envío", async () => {
    const { estadoParticipante } = await cargar();
    const enviada = entrada([2, 3, 1, 4], { enviadoEn: "2026-10-25T10:00:00.000Z" });
    expect(estadoParticipante(enviada, INDICADORES)).toBe("enviado");
    const editada = { ...enviada, modificadoEn: "2026-10-25T10:05:00.000Z" };
    expect(estadoParticipante(editada, INDICADORES)).toBe("completado");
  });

  it("sin registro local de envío usa la fecha del servidor", async () => {
    const { estadoParticipante } = await cargar();
    // Sent from another device, or drafts cleared with Borrar todo.
    expect(estadoParticipante(undefined, INDICADORES, "2026-10-25T09:00:00.000Z")).toBe("enviado");
    expect(estadoParticipante(entrada([2, 3, 1, 4]), INDICADORES, "2026-10-25T11:00:00.000Z")).toBe("enviado");
    expect(estadoParticipante(entrada([2, 3, 1, 4]), INDICADORES, "2026-10-25T09:00:00.000Z")).toBe("completado");
    expect(estadoParticipante(entrada([2]), INDICADORES, "2026-10-25T09:00:00.000Z")).toBe("enProgreso");
  });

  it("con registro local de envío, la hora del servidor no lo contradice (desfase de relojes)", async () => {
    const { estadoParticipante } = await cargar();
    // Edited at 10:05 device time after a send at 10:00; the server clock runs ahead.
    const editada = entrada([2, 3, 1, 4], { enviadoEn: "2026-10-25T10:00:00.000Z", modificadoEn: "2026-10-25T10:05:00.000Z" });
    expect(estadoParticipante(editada, INDICADORES, "2026-10-25T10:10:00.000Z")).toBe("completado");
    // Sent at 10:00 device time; the server clock runs behind.
    const enviada = entrada([2, 3, 1, 4], { enviadoEn: "2026-10-25T10:00:00.000Z" });
    expect(estadoParticipante(enviada, INDICADORES, "2026-10-25T09:55:00.000Z")).toBe("enviado");
  });
});

describe("marcarEnviado", () => {
  it("registra enviadoEn sin tocar modificadoEn ni las calificaciones", async () => {
    const { marcarEnviado, estadoParticipante } = await cargar();
    const original = borradorCon({ P01: entrada([1, 2, 3, 4]), P02: entrada([1]) });
    const enviado = marcarEnviado(original, "P01", "2026-10-25T10:00:00.000Z", new Date("2026-10-25T10:00:03.000Z"));
    expect(enviado.participantes.P01).toEqual({ ...original.participantes.P01, enviadoEn: "2026-10-25T10:00:03.000Z" });
    expect(enviado.participantes.P02).toBe(original.participantes.P02);
    expect(original.participantes.P01.enviadoEn).toBeUndefined();
    expect(estadoParticipante(enviado.participantes.P01, INDICADORES)).toBe("enviado");
  });

  it("un cambio durante el envío deja la evaluación en Completado (hay que reenviar)", async () => {
    const { marcarEnviado, estadoParticipante } = await cargar();
    const editada = borradorCon({ P01: entrada([1, 2, 3, 4], { modificadoEn: "2026-10-25T10:00:02.000Z" }) });
    const resultado = marcarEnviado(editada, "P01", "2026-10-25T10:00:00.000Z", new Date("2026-10-25T10:00:03.000Z"));
    expect(resultado.participantes.P01.enviadoEn).toBe("2026-10-25T10:00:00.000Z");
    expect(estadoParticipante(resultado.participantes.P01, INDICADORES)).toBe("completado");
  });

  it("no hace nada si el participante ya no está en el borrador", async () => {
    const { marcarEnviado } = await cargar();
    const vacio = borradorCon({});
    expect(marcarEnviado(vacio, "P01", "2026-10-25T10:00:00.000Z")).toBe(vacio);
  });
});

describe("edición de calificaciones", () => {
  const AHORA = new Date("2026-10-25T12:00:00.000Z");
  const IA = { nivelSugerido: 3, probabilidades: { "1": 0.05, "2": 0.17, "3": 0.78, "4": 0 }, confianza: 0.71, modelo: "jev-1.13.0" };

  it("crea la entrada del participante y marca modificadoEn", async () => {
    const { conCalificacion, nivelManual, borradorVacio } = await cargar();
    const vacio = borradorVacio();
    const resultado = conCalificacion(vacio, "P01", "i1", nivelManual(2), AHORA);
    expect(resultado.participantes.P01).toEqual({
      calificaciones: { i1: { nivel: 2, origen: "manual" } },
      modificadoEn: AHORA.toISOString(),
    });
    expect(vacio.participantes).toEqual({}); // never mutates the input
  });

  it("conserva enviadoEn, los demás indicadores y los demás participantes", async () => {
    const { conCalificacion, nivelManual } = await cargar();
    const inicial = borradorCon({
      P01: entrada([1, 2], { enviadoEn: "2026-10-25T11:00:00.000Z" }),
      P02: entrada([4]),
    });
    const resultado = conCalificacion(inicial, "P01", "i2", nivelManual(3), AHORA);
    expect(resultado.participantes.P01.enviadoEn).toBe("2026-10-25T11:00:00.000Z");
    expect(resultado.participantes.P01.calificaciones.i1.nivel).toBe(1);
    expect(resultado.participantes.P01.calificaciones.i2.nivel).toBe(3);
    expect(resultado.participantes.P02).toBe(inicial.participantes.P02);
  });

  it("un cambio manual después de aplicar la IA pasa a origen manual y conserva los metadatos", async () => {
    const { conCalificacion, nivelManual } = await cargar();
    const inicial = borradorCon({
      P01: { calificaciones: { i1: { nivel: 3, origen: "ia", ia: IA, observacion: "Texto" } }, modificadoEn: "2026-10-25T10:00:00.000Z" },
    });
    const resultado = conCalificacion(inicial, "P01", "i1", nivelManual(4), AHORA);
    expect(resultado.participantes.P01.calificaciones.i1).toEqual({ nivel: 4, origen: "manual", ia: IA, observacion: "Texto" });
  });

  it("la observación se guarda sin tocar el nivel ni el origen, y vacía se elimina", async () => {
    const { conCalificacion, conObservacion } = await cargar();
    const inicial = borradorCon({ P01: entrada([2]) });
    const conTexto = conCalificacion(inicial, "P01", "i1", conObservacion("Reorganizó sus tareas."), AHORA);
    expect(conTexto.participantes.P01.calificaciones.i1).toEqual({ nivel: 2, origen: "manual", observacion: "Reorganizó sus tareas." });
    const sinTexto = conCalificacion(conTexto, "P01", "i1", conObservacion(""), AHORA);
    expect(sinTexto.participantes.P01.calificaciones.i1).toEqual({ nivel: 2, origen: "manual" });
  });

  it("una observación sin nivel no deja un origen", async () => {
    const { conCalificacion, conObservacion, borradorVacio } = await cargar();
    const resultado = conCalificacion(borradorVacio(), "P01", "i3", conObservacion("Algo"), AHORA);
    expect(resultado.participantes.P01.calificaciones.i3).toEqual({ observacion: "Algo" });
  });

  it("contarCalificados cuenta solo los indicadores con nivel", async () => {
    const { contarCalificados } = await cargar();
    expect(contarCalificados(undefined, INDICADORES)).toBe(0);
    expect(contarCalificados(entrada([1, undefined, 3]), INDICADORES)).toBe(2);
    expect(contarCalificados(entrada([1, 2, 3, 4]), INDICADORES)).toBe(4);
  });

  it("editar una evaluación enviada la devuelve a Completado", async () => {
    const { conCalificacion, conObservacion, estadoParticipante } = await cargar();
    const enviada = borradorCon({ P01: entrada([1, 2, 3, 4], { enviadoEn: "2026-10-25T10:00:00.000Z" }) });
    expect(estadoParticipante(enviada.participantes.P01, INDICADORES)).toBe("enviado");
    const editada = conCalificacion(enviada, "P01", "i1", conObservacion("Nuevo"), AHORA);
    expect(estadoParticipante(editada.participantes.P01, INDICADORES)).toBe("completado");
  });
});

describe("con localStorage disponible", () => {
  it("escribe el borrador después de 300 ms y lo lee de inmediato desde la caché", async () => {
    vi.useFakeTimers();
    const b = await cargar();
    const borrador = borradorCon({ P01: entrada([2]) });
    b.guardarBorrador("adaptabilidad", "jimena-salgado", borrador);

    expect(b.leerBorrador("adaptabilidad", "jimena-salgado")).toBe(borrador);
    expect(window.localStorage.getItem("nivela:v1:adaptabilidad:jimena-salgado")).toBeNull();
    vi.advanceTimersByTime(b.RETARDO_ESCRITURA_MS - 1);
    expect(window.localStorage.getItem("nivela:v1:adaptabilidad:jimena-salgado")).toBeNull();
    vi.advanceTimersByTime(1);
    expect(JSON.parse(window.localStorage.getItem("nivela:v1:adaptabilidad:jimena-salgado")!)).toEqual(borrador);
  });

  it("agrupa escrituras seguidas en una sola", async () => {
    vi.useFakeTimers();
    const b = await cargar();
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    b.guardarBorrador("adaptabilidad", "jimena-salgado", borradorCon({ P01: entrada([1]) }));
    vi.advanceTimersByTime(100);
    b.guardarBorrador("adaptabilidad", "jimena-salgado", borradorCon({ P01: entrada([1, 2]) }));
    vi.advanceTimersByTime(b.RETARDO_ESCRITURA_MS);
    const escrituras = setItem.mock.calls.filter(([clave]) => clave === "nivela:v1:adaptabilidad:jimena-salgado");
    expect(escrituras).toHaveLength(1);
    expect(JSON.parse(escrituras[0][1]).participantes.P01.calificaciones.i2.nivel).toBe(2);
  });

  it("vacía las escrituras pendientes cuando la página se oculta", async () => {
    vi.useFakeTimers();
    const b = await cargar();
    b.guardarBorrador("adaptabilidad", "jimena-salgado", borradorCon({ P01: entrada([4]) }));
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(window.localStorage.getItem("nivela:v1:adaptabilidad:jimena-salgado")).not.toBeNull();
  });

  it("vacía las escrituras pendientes en pagehide", async () => {
    vi.useFakeTimers();
    const b = await cargar();
    b.guardarBorrador("adaptabilidad", "jimena-salgado", borradorCon({ P01: entrada([4]) }));
    window.dispatchEvent(new Event("pagehide"));
    expect(window.localStorage.getItem("nivela:v1:adaptabilidad:jimena-salgado")).not.toBeNull();
  });

  it("sobrevive a una recarga (nuevo módulo, mismo almacenamiento)", async () => {
    const primero = await cargar();
    primero.guardarEvaluador("adaptabilidad", "jimena-salgado");
    primero.guardarBorrador("adaptabilidad", "jimena-salgado", borradorCon({ P01: entrada([3, 3]) }));
    primero.vaciarEscrituras();

    const segundo = await cargar();
    expect(segundo.leerEvaluador("adaptabilidad")).toBe("jimena-salgado");
    expect(segundo.leerBorrador("adaptabilidad", "jimena-salgado")?.participantes.P01.calificaciones.i2.nivel).toBe(3);
  });

  it("un JSON corrupto se trata como borrador vacío", async () => {
    window.localStorage.setItem("nivela:v1:adaptabilidad:jimena-salgado", "{no es json");
    const b = await cargar();
    expect(b.leerBorrador("adaptabilidad", "jimena-salgado")).toBeNull();
  });

  it("borrarTodo elimina solo las claves nivela:v1:", async () => {
    vi.useFakeTimers();
    window.localStorage.setItem("otra-app", "conservar");
    window.localStorage.setItem("nivela:v2:futuro", "conservar");
    window.localStorage.setItem("nivela:v1:orientacion-resultados:alguien", "{}");
    const b = await cargar();
    b.guardarEvaluador("adaptabilidad", "jimena-salgado");
    b.guardarBorrador("adaptabilidad", "jimena-salgado", borradorCon({ P01: entrada([1]) }));
    b.vaciarEscrituras();
    b.guardarBorrador("adaptabilidad", "jimena-salgado", borradorCon({ P02: entrada([1]) })); // still pending

    b.borrarTodo();
    vi.runAllTimers(); // the cancelled pending write must not come back

    expect(window.localStorage.getItem("otra-app")).toBe("conservar");
    expect(window.localStorage.getItem("nivela:v2:futuro")).toBe("conservar");
    const restantes = Object.keys(window.localStorage).filter((k) => k.startsWith("nivela:v1:"));
    expect(restantes).toEqual([]);
    expect(b.leerEvaluador("adaptabilidad")).toBeNull();
    expect(b.leerBorrador("adaptabilidad", "jimena-salgado")).toBeNull();
  });

  it("avisa a los suscriptores en cada cambio", async () => {
    const b = await cargar();
    const oyente = vi.fn();
    const cancelar = b.suscribir(oyente);
    b.guardarEvaluador("adaptabilidad", "jimena-salgado");
    b.guardarBorrador("adaptabilidad", "jimena-salgado", borradorCon({}));
    b.borrarTodo();
    expect(oyente).toHaveBeenCalledTimes(3);
    cancelar();
    b.guardarEvaluador("adaptabilidad", "jimena-salgado");
    expect(oyente).toHaveBeenCalledTimes(3);
  });

  it("almacenamientoDisponible es true", async () => {
    const b = await cargar();
    expect(b.almacenamientoDisponible()).toBe(true);
  });
});

describe("cuando localStorage falla", () => {
  it("si el acceso lanza una excepción, todo funciona en memoria", async () => {
    restaurar = bloquearLocalStorage();
    vi.useFakeTimers();
    const b = await cargar();

    expect(b.almacenamientoDisponible()).toBe(false);
    expect(() => b.guardarEvaluador("adaptabilidad", "jimena-salgado")).not.toThrow();
    const borrador = borradorCon({ P01: entrada([2, 2]) });
    expect(() => b.guardarBorrador("adaptabilidad", "jimena-salgado", borrador)).not.toThrow();
    expect(() => vi.runAllTimers()).not.toThrow();

    expect(b.leerEvaluador("adaptabilidad")).toBe("jimena-salgado");
    expect(b.leerBorrador("adaptabilidad", "jimena-salgado")).toEqual(borrador);

    expect(() => b.borrarTodo()).not.toThrow();
    expect(b.leerEvaluador("adaptabilidad")).toBeNull();
    expect(b.leerBorrador("adaptabilidad", "jimena-salgado")).toBeNull();
  });

  it("si solo falla la escritura (cuota llena), conserva lo que ya estaba guardado", async () => {
    window.localStorage.setItem("nivela:v1:evaluador:adaptabilidad", "jimena-salgado");
    const b = await cargar();
    expect(b.almacenamientoDisponible()).toBe(true);

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });
    b.guardarBorrador("adaptabilidad", "jimena-salgado", borradorCon({ P01: entrada([1]) }));
    expect(() => b.vaciarEscrituras()).not.toThrow();

    expect(b.almacenamientoDisponible()).toBe(false);
    const recargado = await cargar(); // fresh cache, same blocked storage
    expect(recargado.leerEvaluador("adaptabilidad")).toBe("jimena-salgado");
    expect(b.leerBorrador("adaptabilidad", "jimena-salgado")?.participantes.P01).toBeDefined();
  });

  it("notifica el cambio a memoria fuera del render (para el aviso único)", async () => {
    restaurar = bloquearLocalStorage();
    const b = await cargar();
    const oyente = vi.fn();
    b.suscribir(oyente);
    b.leerEvaluador("adaptabilidad");
    expect(oyente).not.toHaveBeenCalled(); // never synchronously, it may be mid-render
    await Promise.resolve();
    expect(oyente).toHaveBeenCalledTimes(1);
  });
});

describe("sin window (servidor)", () => {
  it("las lecturas devuelven null y las escrituras no hacen nada", async () => {
    vi.stubGlobal("window", undefined);
    try {
      const b = await cargar();
      expect(b.leerEvaluador("adaptabilidad")).toBeNull();
      expect(b.leerBorrador("adaptabilidad", "x")).toBeNull();
      expect(() => b.guardarEvaluador("adaptabilidad", "x")).not.toThrow();
      expect(() => b.borrarTodo()).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("sugerencia de Jev aplicada (PRD §5.6)", () => {
  const AHORA = new Date("2026-10-25T12:00:00.000Z");
  const IA = { nivelSugerido: 3, probabilidades: { "1": 0.05, "2": 0.17, "3": 0.78, "4": 0 }, confianza: 0.71, modelo: "jev-1.13.0" };

  it("aplicar guarda nivel, origen ia y los metadatos; sin texto no toca la observación", async () => {
    const { conCalificacion, aplicarSugerencia } = await cargar();
    const inicial = borradorCon({
      P01: { calificaciones: { i1: { observacion: "Previa" } }, modificadoEn: "2026-10-25T10:00:00.000Z" },
    });
    const resultado = conCalificacion(inicial, "P01", "i1", aplicarSugerencia(3, IA), AHORA);
    expect(resultado.participantes.P01.calificaciones.i1).toEqual({ nivel: 3, origen: "ia", ia: IA, observacion: "Previa" });
    expect(resultado.participantes.P01.modificadoEn).toBe(AHORA.toISOString());
  });

  it("aplicar la alternativa conserva el nivel que sugirió Jev en los metadatos", async () => {
    const { conCalificacion, aplicarSugerencia, borradorVacio } = await cargar();
    const resultado = conCalificacion(borradorVacio(), "P01", "i1", aplicarSugerencia(4, IA, "Texto analizado"), AHORA);
    expect(resultado.participantes.P01.calificaciones.i1).toEqual({
      nivel: 4,
      origen: "ia",
      ia: IA,
      observacion: "Texto analizado",
    });
  });

  it("aplicar y luego elegir a mano: origen manual, metadatos de IA conservados", async () => {
    const { conCalificacion, aplicarSugerencia, nivelManual, borradorVacio } = await cargar();
    const aplicado = conCalificacion(borradorVacio(), "P01", "i1", aplicarSugerencia(3, IA), AHORA);
    const manual = conCalificacion(aplicado, "P01", "i1", nivelManual(2), AHORA);
    expect(manual.participantes.P01.calificaciones.i1).toEqual({ nivel: 2, origen: "manual", ia: IA });
  });

  describe("observacionConTexto", () => {
    it("sin observación previa usa el texto", async () => {
      const { observacionConTexto } = await cargar();
      expect(observacionConTexto(undefined, "  Texto nuevo  ", 1000)).toBe("Texto nuevo");
      expect(observacionConTexto("   ", "Texto nuevo", 1000)).toBe("Texto nuevo");
    });

    it("con observación previa agrega el texto tras una línea en blanco", async () => {
      const { observacionConTexto } = await cargar();
      expect(observacionConTexto("Nota previa.\n", "Texto nuevo", 1000)).toBe("Nota previa.\n\nTexto nuevo");
    });

    it("no duplica un texto que ya está en la observación (aplicar dos veces)", async () => {
      const { observacionConTexto } = await cargar();
      const una = observacionConTexto("Nota previa.", "Texto nuevo", 1000)!;
      expect(observacionConTexto(una, "Texto nuevo", 1000)).toBe(una);
    });

    it("es null cuando el resultado pasaría del máximo: nunca se recorta", async () => {
      const { observacionConTexto } = await cargar();
      expect(observacionConTexto(undefined, "a".repeat(1001), 1000)).toBeNull();
      expect(observacionConTexto("a".repeat(990), "b".repeat(20), 1000)).toBeNull();
      expect(observacionConTexto(undefined, "a".repeat(1000), 1000)).toBe("a".repeat(1000));
    });
  });
});
