"use client";

import React from "react";
import { Seat, TableType } from "@/lib/types";
import { Users, Armchair, Check, Trash2 } from "lucide-react";

interface CircleTableProps {
  tableNumber: string;
  tableType?: TableType;
  seats: Seat[];
  selectedSeatIds: string[];
  isStudent?: boolean;
  canManage?: boolean;
  isSlotPast?: boolean;
  onToggleSeat: (seat: Seat) => void;
  onSelectTable?: (seats: Seat[]) => void;
  onDeleteTable?: (tableNumber: string) => void;
  onDeleteSeat?: (seatId: string) => void;
  zoneColor?: string;
}

export function CircleTable({
  tableNumber,
  seats,
  selectedSeatIds,
  isStudent = true,
  canManage = false,
  isSlotPast = false,
  onToggleSeat,
  onSelectTable,
  onDeleteTable,
  onDeleteSeat,
  zoneColor = "#4f46e5",
}: CircleTableProps) {
  const totalChairs = seats.length;
  const availableSeats = seats.filter((s) => s.isActive && !s.isBooked && !s.isOccupied && !isSlotPast);
  const isAllAvailable = availableSeats.length === totalChairs && totalChairs > 0;
  const isAllSelected = totalChairs > 0 && seats.every((s) => selectedSeatIds.includes(s.id));

  // Circular layout calculations
  // Center is at (130, 130), table radius is 50, chair center orbit radius is 92
  const center = 130;
  const orbitRadius = 88;

  return (
    <div className="relative flex flex-col items-center p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md transition-all duration-200 group">
      {/* Table Header Controls */}
      <div className="w-full flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 text-xs font-black border border-emerald-100">
            🟢
          </span>
          <div>
            <h4 className="text-xs font-black text-slate-900 tracking-tight">{tableNumber}</h4>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Round Table &bull; {availableSeats.length}/{totalChairs} Free
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {isStudent && availableSeats.length > 1 && onSelectTable && (
            <button
              type="button"
              onClick={() => onSelectTable(availableSeats)}
              className="rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-[10px] font-black text-indigo-700 hover:bg-indigo-600 hover:text-white transition-colors"
            >
              {isAllSelected ? "Deselect" : "Select Available"}
            </button>
          )}

          {canManage && onDeleteTable && (
            <button
              type="button"
              onClick={() => onDeleteTable(tableNumber)}
              className="rounded-full p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
              title={`Delete ${tableNumber}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* SVG Canvas for Round Table & Radial Chairs */}
      <div className="relative w-[260px] h-[260px] flex items-center justify-center select-none my-1">
        <svg className="w-full h-full" viewBox="0 0 260 260">
          {/* Subtle connection glow circle */}
          <circle
            cx={center}
            cy={center}
            r={orbitRadius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          {/* Central Circular Table Graphic */}
          <circle
            cx={center}
            cy={center}
            r="46"
            fill="#f8fafc"
            stroke="#cbd5e1"
            strokeWidth="2.5"
            className="drop-shadow-xs"
          />
          <circle
            cx={center}
            cy={center}
            r="38"
            fill="#ffffff"
            stroke="#e2e8f0"
            strokeWidth="1"
          />
        </svg>

        {/* Center Table Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2">
          <Users className="h-4 w-4 text-slate-400 mb-0.5" />
          <span className="text-[11px] font-black text-slate-800 leading-tight">{tableNumber}</span>
          <span
            className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full mt-0.5 ${
              availableSeats.length > 0
                ? "bg-emerald-100 text-emerald-800"
                : "bg-slate-200 text-slate-600"
            }`}
          >
            {availableSeats.length > 0 ? `${availableSeats.length} Open` : "Full"}
          </span>
        </div>

        {/* Circular Chairs positioned radially */}
        {seats.map((seat, idx) => {
          const angle = (idx * 2 * Math.PI) / totalChairs - Math.PI / 2;
          const x = center + orbitRadius * Math.cos(angle);
          const y = center + orbitRadius * Math.sin(angle);

          const isInactive = !seat.isActive;
          const isBooked = !isInactive && (seat.isBooked || seat.isOccupied);
          const isMyBooking = seat.isMyBooking;
          const isAvailable = !isInactive && !isBooked && !isSlotPast;
          const isSelected = selectedSeatIds.includes(seat.id);

          return (
            <div
              key={seat.id}
              style={{
                position: "absolute",
                left: `${x}px`,
                top: `${y}px`,
                transform: "translate(-50%, -50%)",
              }}
              className="z-10 group/chair"
            >
              <button
                type="button"
                disabled={!isAvailable || !isStudent}
                onClick={() => isAvailable && isStudent && onToggleSeat(seat)}
                title={`${seat.seatNumber} (${isBooked ? "Reserved" : isInactive ? "Disabled" : "Available"})`}
                className={`relative h-11 w-11 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 border-2 shadow-xs ${
                  isInactive
                    ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-50"
                    : isMyBooking
                    ? "bg-violet-500 border-violet-600 text-white shadow-md ring-2 ring-violet-400/30"
                    : isBooked
                    ? "bg-rose-50 border-rose-200 text-rose-700 cursor-not-allowed opacity-90"
                    : isSelected
                    ? "bg-slate-900 border-slate-900 text-white shadow-lg scale-110 ring-3 ring-indigo-500/20"
                    : "bg-white border-emerald-300 text-slate-800 hover:border-slate-900 hover:scale-110 hover:shadow-md cursor-pointer"
                }`}
              >
                <span className="text-[9px] font-black tracking-tighter truncate px-1">
                  {seat.seatNumber.replace(/.*-/, "") || seat.seatNumber}
                </span>

                {isSelected ? (
                  <Check className="h-3 w-3 text-white stroke-[3]" />
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
              </button>

              {/* Admin quick delete chair */}
              {canManage && onDeleteSeat && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSeat(seat.id);
                  }}
                  className="absolute -top-1.5 -right-1.5 z-20 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-white opacity-0 shadow-sm transition-all group-hover/chair:opacity-100 hover:bg-rose-600"
                  title={`Delete ${seat.seatNumber}`}
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
