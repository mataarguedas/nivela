import { TEXTOS } from "@/config/textos";
import { Boton } from "./Boton";

// "Salir" in the nav: a plain form POST, so it works before hydration and
// needs no client JS. /api/salir answers 303 → /acceso, a full page load
// that also drops the client router cache.

export function BotonSalir() {
  return (
    <form action="/api/salir" method="post" className="contents">
      <Boton type="submit" variante="texto">
        {TEXTOS.sesion.salir}
      </Boton>
    </form>
  );
}
