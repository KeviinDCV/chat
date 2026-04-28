"use client";

import { ReactNode } from "react";

/**
 * On mobile: full screen.
 * On desktop: a centered, phone-sized frame so it never looks gigantic.
 */
export default function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="app-h w-full flex items-center justify-center md:p-6">
      <div
        className="
          relative w-full app-h
          md:h-[860px] md:max-h-[92vh] md:w-[400px]
          md:rounded-[44px] md:shadow-phone md:ring-1 md:ring-black/10
          overflow-hidden bg-black
        "
      >
        {/* Bezel inner */}
        <div className="absolute inset-0 md:rounded-[44px] md:m-[3px] md:bg-white overflow-hidden">
          {/* Notch (desktop only) */}
          <div className="hidden md:block pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 z-30">
            <div className="h-7 w-32 rounded-full bg-black" />
          </div>
          <div className="relative app-h md:h-full w-full phone-bg">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
