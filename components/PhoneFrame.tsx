"use client";

import { ReactNode } from "react";

/**
 * En móvil: ocupa toda la pantalla.
 * En escritorio: tarjeta centrada con esquinas redondeadas (no es un marco de iPhone,
 * solo un rectángulo aesthetic).
 */
export default function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="app-h w-full flex items-center justify-center md:p-6">
      <div
        className="
          relative w-full app-h bg-white
          md:h-[820px] md:max-h-[92vh] md:w-[400px]
          md:rounded-[40px] md:shadow-phone md:ring-1 md:ring-black/5
          overflow-hidden
        "
      >
        <div className="relative h-full w-full phone-bg">{children}</div>
      </div>
    </div>
  );
}
