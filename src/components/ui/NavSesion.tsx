import { connection } from "next/server";
import { TEXTOS } from "@/config/textos";
import { getSesion } from "@/lib/sesion";
import { Boton } from "./Boton";
import { BotonSalir } from "./BotonSalir";
import { NavEvaluador } from "./NavEvaluador";

// Right slot of the nav for the current session: "Reportes" for the docente
// and "Salir" for any signed-in user. Reads the cookie, so the layout renders
// it inside <Suspense> (Cache Components). On /[competencia] routes the
// selected evaluator's name comes first (see NavEvaluador).

export async function NavSesion() {
  // Verifying the JWT compares its expiry with the clock. On routes with
  // params, Next prerenders with cookies available (runtime prefetch), where
  // reading the time is an error; this keeps the check at request time.
  await connection();
  const sesion = await getSesion();
  if (!sesion) return null;
  return (
    <>
      <NavEvaluador />
      {sesion.rol === "docente" && (
        <Boton variante="texto" href="/reportes">
          {TEXTOS.reportes.enlace}
        </Boton>
      )}
      <BotonSalir />
    </>
  );
}
