"use client";

import { useEffect } from "react";
import { initSiteMotion } from "./motion";

/** Única isla de cliente del sitio: conecta el motor de movimiento al HTML del servidor. */
export function SiteMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".ym");
    if (!root) return;
    return initSiteMotion(root);
  }, []);
  return null;
}
