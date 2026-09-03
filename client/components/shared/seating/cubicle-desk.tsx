"use client";

import React from "react";
import { Seat } from "@/lib/types";
import { Armchair, Check, Trash2, Shield, Zap, Sparkles } from "lucide-react";

interface CubicleDeskProps {
  seat: Seat;
  isSelected: boolean;
  canManage?: boolean;
  isStudent?: boolean;
  isSlotPast?: boolean;
  onSelect: (seat: Seat) => void;
  onDelete?: (id: string) => void;
  zoneColor?: string;
}

export function CubicleDesk({
  seat,
  isSelected,
  canManage = false,
  isStudent = true,
  isSlotPast = false,
  onSelect,
  onDelete,
  zoneColor = "#0f172a",
}: CubicleDeskProps) {
  const isInactive = !seat.isActive;
  const isBooked = !isInactive && (seat.isBooked || seat.isOccupied);
  const isMyBooking = seat.isMyBooking;
  const isAvailable = !isInactive && !isBooked && !isSlotPast;

  const handleClick = () => {
    if (!isAvailable || !isStudent) return;
    onSelect(seat);
  };

  return (
    <div className="relative group/cubicle flex flex-col items-center">
      {canManage && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(seat.id);
          }}
          className="absolute -top-2 -right-2 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white opacity-0 shadow-sm transition-all group-hover/cubicle:opacity-100 hover:bg-rose-600 active:scale-95"
          title={`Delete ${seat.seatNumber}`}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}

      {/* Cubicle Physical Boundary Box */}
      <button
        type="button"
        disabled={!isAvailable || !isStudent}
        onClick={handleClick}
        className={`relative w-24 sm:w-28 h-28 sm:h-32 rounded-2xl flex flex-col items-center justify-between p-2.5 transition-all duration-200 border-2 select-none ${
          isInactive
            ? "bg-slate-100/80 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed"
            : isMyBooking
            ? "bg-violet-50/90 border-violet-500 text-violet-900 shadow-md ring-2 ring-violet-500/20 cursor-default"
            : isBooked
            ? "bg-rose-50/80 border-rose-200 text-rose-900 shadow-2xs cursor-not-allowed"
            : isSlotPast
            ? "bg-slate-100/70 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed"
            : isSelected
            ? "bg-slate-900 border-slate-900 text-white shadow-xl scale-105 ring-4 ring-slate-900/15"
            : "bg-white border-slate-200/90 text-slate-700 hover:border-slate-400 hover:shadow-md hover:scale-102 cursor-pointer"
        }`}
      >
        {/* Top Acoustic Partition Wall Visual */}
        <div
          className={`w-full h-3 rounded-t-lg flex items-center justify-between px-1.5 text-[8px] font-black uppercase tracking-wider transition-colors ${
            isSelected
              ? "bg-slate-800 text-slate-300"
              : isBooked
              ? "bg-rose-100 text-rose-800"
              : isMyBooking
              ? "bg-violet-200 text-violet-800"
              : "bg-slate-100 text-slate-600 border border-slate-200"
          }`}
        >
          <span>{seat.seatNumber}</span>
          <span>🔇 Silent</span>
        </div>

        {/* Center Study Lamp / Chair */}
        <div className="flex flex-col items-center justify-center my-auto">
          {isSelected ? (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-900 shadow-xs">
              <Check className="h-4 w-4 stroke-[3]" />
            </div>
          ) : (
            <Armchair
              className={`h-6 w-6 transition-transform duration-200 ${
                isMyBooking
                  ? "text-violet-600 scale-110"
                  : isBooked
                  ? "text-rose-400"
                  : "text-slate-400 group-hover/cubicle:text-slate-600"
              }`}
            />
          )}

          <div className="mt-1 flex items-center justify-center">
            {isInactive ? (
              <span className="text-[9px] font-bold text-slate-400">Offline</span>
            ) : isMyBooking ? (
              <span className="text-[9px] font-black text-violet-700">My Desk</span>
            ) : isBooked ? (
              <span className="text-[9px] font-extrabold text-rose-700">Occupied</span>
            ) : isSlotPast ? (
              <span className="text-[9px] font-bold text-slate-400">Ended</span>
            ) : isSelected ? (
              <span className="text-[9px] font-black text-white">Selected</span>
            ) : (
              <span className="text-[9px] font-bold text-emerald-600">Available</span>
            )}
          </div>
        </div>

        {/* Desk Foot / Partition Base */}
        <div className="w-full flex justify-between items-center px-1 text-[8px] text-slate-400 font-mono">
          <span>⚡ Outlet</span>
          <span>💡 Lamp</span>
        </div>
      </button>
    </div>
  );
}
