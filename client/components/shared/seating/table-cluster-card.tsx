"use client";

import React from "react";
import { TableCluster, Seat } from "@/lib/types";
import { Users, Armchair, Check, CheckCircle2, ArrowRight } from "lucide-react";

interface TableClusterCardProps {
  cluster: TableCluster;
  selectedSeatIds: string[];
  isStudent?: boolean;
  onlyAvailable?: boolean;
  onToggleSeat: (seat: Seat) => void;
  onSelectEntireTable?: (seats: Seat[]) => void;
}

export function TableClusterCard({
  cluster,
  selectedSeatIds,
  isStudent = true,
  onlyAvailable = false,
  onToggleSeat,
  onSelectEntireTable,
}: TableClusterCardProps) {
  const availableSeats = cluster.seats.filter((s) => s.isActive && !s.isBooked && !s.isOccupied);
  const displaySeats = onlyAvailable ? availableSeats : cluster.seats;
  const isAllSelected =
    displaySeats.length > 0 && displaySeats.every((s) => selectedSeatIds.includes(s.id));
  const someSelected = displaySeats.some((s) => selectedSeatIds.includes(s.id));

  const tableTypeIcon =
    cluster.tableType === "circle_table"
      ? "🟢"
      : cluster.tableType === "meeting_table"
      ? "🟦"
      : cluster.tableType === "booth_pod"
      ? "🛋️"
      : "🪑";

  return (
    <div
      className={`p-4 rounded-3xl border transition-all duration-200 ${
        isAllSelected
          ? "bg-slate-900 border-slate-900 text-white shadow-lg ring-2 ring-slate-900/10"
          : someSelected
          ? "bg-indigo-50/70 border-indigo-300 text-slate-900 shadow-sm"
          : "bg-white border-slate-200/90 text-slate-900 hover:shadow-md hover:border-slate-300"
      }`}
    >
      {/* Top Table Summary */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">{tableTypeIcon}</span>
          <div>
            <h4
              className={`text-sm font-black tracking-tight ${
                isAllSelected ? "text-white" : "text-slate-900"
              }`}
            >
              {cluster.tableNumber}
            </h4>
            <p
              className={`text-[10px] font-bold uppercase tracking-wider ${
                isAllSelected ? "text-slate-300" : "text-slate-400"
              }`}
            >
              {cluster.tableType.replace("_", " ")} &bull; {cluster.totalSeats} Chairs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-black border ${
              availableSeats.length > 0
                ? isAllSelected
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                : isAllSelected
                ? "bg-slate-800 text-slate-400 border-slate-700"
                : "bg-slate-100 text-slate-500 border-slate-200"
            }`}
          >
            {availableSeats.length} Available
          </span>

          {isStudent && availableSeats.length > 0 && onSelectEntireTable && (
            <button
              type="button"
              onClick={() => onSelectEntireTable(availableSeats)}
              className={`rounded-full px-3 py-1 text-xs font-black transition-all ${
                isAllSelected
                  ? "bg-white text-slate-900 hover:bg-slate-100"
                  : "bg-slate-900 text-white hover:bg-slate-800 shadow-2xs"
              }`}
            >
              {isAllSelected ? "Deselect All" : "Select All"}
            </button>
          )}
        </div>
      </div>

      {/* Individual Chairs Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-2 border-t border-slate-100/60">
        {displaySeats.map((seat) => {
          const isInactive = !seat.isActive;
          const isBooked = !isInactive && (seat.isBooked || seat.isOccupied);
          const isMyBooking = seat.isMyBooking;
          const isAvailable = !isInactive && !isBooked;
          const isSelected = selectedSeatIds.includes(seat.id);

          return (
            <button
              key={seat.id}
              type="button"
              disabled={!isAvailable || !isStudent}
              onClick={() => isAvailable && isStudent && onToggleSeat(seat)}
              className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-between gap-1 select-none ${
                isInactive
                  ? "bg-slate-100 text-slate-400 border-slate-200 opacity-50 cursor-not-allowed"
                  : isMyBooking
                  ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                  : isBooked
                  ? "bg-rose-50 text-rose-700 border-rose-200 opacity-90 cursor-not-allowed"
                  : isSelected
                  ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-white/30"
                  : isAllSelected
                  ? "bg-slate-800 text-white border-slate-700 hover:border-white"
                  : "bg-slate-50 hover:bg-white border-slate-200 text-slate-800 hover:border-slate-400 cursor-pointer shadow-2xs"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] font-black tracking-tight truncate">
                  {seat.seatNumber}
                </span>
                {isSelected ? (
                  <Check className="h-3 w-3 text-emerald-400 stroke-[3]" />
                ) : (
                  <Armchair
                    className={`h-3 w-3 ${
                      isBooked
                        ? "text-rose-400"
                        : isMyBooking
                        ? "text-white"
                        : isAvailable
                        ? "text-emerald-500"
                        : "text-slate-400"
                    }`}
                  />
                )}
              </div>
              <span
                className={`text-[9px] font-bold ${
                  isBooked
                    ? "text-rose-600"
                    : isMyBooking
                    ? "text-violet-200"
                    : isSelected
                    ? "text-white"
                    : "text-emerald-600"
                }`}
              >
                {isBooked ? "Reserved" : isMyBooking ? "Mine" : isSelected ? "Selected" : "Open"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
