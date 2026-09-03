"use client";

import React from "react";
import { Printer, Wifi, Zap, Coffee } from "lucide-react";

export function AmenitiesStrip() {
  return (
    <section className="pulse-card p-6 space-y-4">
      <div className="border-b border-slate-100 pb-3">
        <span className="kicker-label">CAMPUS FACILITIES</span>
        <h2 className="text-base font-extrabold text-slate-900">
          Student Amenities & Learning Resources
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-2xs shrink-0">
            <Printer className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900">Cloud Printing</h3>
            <p className="text-[10px] text-slate-400">Wireless 3D & Color</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-2xs shrink-0">
            <Wifi className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900">Eduroam Wi-Fi</h3>
            <p className="text-[10px] text-slate-400">1 Gbps Ultra-Low Ping</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-amber-600 shadow-2xs shrink-0">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900">Power Stations</h3>
            <p className="text-[10px] text-slate-400">USB-C & Fast Charge</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-rose-600 shadow-2xs shrink-0">
            <Coffee className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900">Quiet Lounge</h3>
            <p className="text-[10px] text-slate-400">Filtered Water & Coffee</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AmenitiesStrip;
