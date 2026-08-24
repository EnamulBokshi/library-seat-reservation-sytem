"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Zone, DashboardStats } from "@/lib/types";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

// ─── Default Zone Visual Images ───────────────────────────────────────────────
const ZONE_IMAGES: Record<string, string> = {
  "Silent Zone":
    "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=80",
  "Group Study Zone":
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
  "Computer Zone":
    "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80",
  "Reading Zone":
    "https://images.unsplash.com/photo-1568667256549-094345857637?auto=format&fit=crop&w=1200&q=80",
};

const DEFAULT_ZONE_IMAGE =
  "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=80";

interface ZonesCarouselProps {
  zones: Zone[];
  stats: DashboardStats | null;
}

export function ZonesCarousel({ zones, stats }: ZonesCarouselProps) {
  const [activeSlide, setActiveSlide] = useState(0);

  const totalSlides = zones.length > 0 ? zones.length : 1;

  const handleNextSlide = () => {
    setActiveSlide((prev) => (prev + 1) % totalSlides);
  };

  const handlePrevSlide = () => {
    setActiveSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="kicker-label">EXPLORE STUDY ZONES</span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Choose Your Ideal Study Environment
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handlePrevSlide}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-100 transition-colors active:scale-95"
            title="Previous Zone"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={handleNextSlide}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-100 transition-colors active:scale-95"
            title="Next Zone"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <Link
            href="/book"
            className="pulse-button-primary py-2 px-4 text-xs ml-2"
          >
            <span>Book a Seat</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Carousel Container */}
      {zones.length === 0 ? (
        <div className="pulse-card p-12 text-center text-slate-400 text-xs font-medium">
          Loading library zones...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {zones.map((zone) => {
            const img = ZONE_IMAGES[zone.name] || DEFAULT_ZONE_IMAGE;
            const liveStat = stats?.liveZones?.find((lz) => lz.id === zone.id);
            const totalSeats = liveStat?.totalSeats ?? zone.seatCount ?? 0;
            const availableSeats = liveStat?.availableSeats ?? totalSeats;
            const occupiedSeats = liveStat?.occupiedSeats ?? 0;
            const occupancy = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;

            return (
              <div
                key={zone.id}
                className="group pulse-card overflow-hidden flex flex-col justify-between hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                {/* Zone Image Banner */}
                <div className="relative aspect-16/10 w-full overflow-hidden bg-slate-900">
                  <img
                    src={img}
                    alt={zone.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

                  <div className="absolute top-3 left-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md border ${
                        zone.isActive
                          ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-300"
                          : "bg-slate-500/20 border-slate-400/40 text-slate-300"
                      }`}
                    >
                      {zone.isActive ? "Open" : "Closed"}
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                    <div>
                      <h3 className="text-base font-black text-white leading-tight">
                        {zone.name}
                      </h3>
                      <p className="text-[11px] text-slate-300 font-medium mt-0.5">
                        {availableSeats} / {totalSeats} seats ready
                      </p>
                    </div>

                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-extrabold text-white backdrop-blur-sm">
                      {occupancy}% Full
                    </span>
                  </div>
                </div>

                {/* Zone Body */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <p className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed">
                    {zone.description ||
                      "Modern study hall equipped with ergonomic chairs and high-speed Wi-Fi."}
                  </p>

                  {/* Rules / Highlights */}
                  {zone.rules && zone.rules.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {zone.rules.slice(0, 2).map((r, i) => (
                        <span
                          key={i}
                          className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Action CTA */}
                  <Link
                    href={`/book?zoneId=${zone.id}`}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
                  >
                    <span>Reserve in this Zone</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default ZonesCarousel;
