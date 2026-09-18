"use client"

import { useEffect } from "react"

/**
 * Registro del service worker. Va en un componente cliente aparte (en vez
 * de código suelto en el layout) para que sea trivial de testear o quitar,
 * y porque `navigator.serviceWorker` no existe en el render de servidor.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registrar el service worker es una mejora progresiva: si falla
      // (por ejemplo en un navegador sin soporte), la app sigue andando.
    })
  }, [])

  return null
}
