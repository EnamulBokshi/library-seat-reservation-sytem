"use client";

import React from "react";
import { Seat, TableType } from "@/lib/types";
import { Users, Armchair, Check, Trash2, Monitor } from "lucide-react";

interface MeetingTableProps {
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

export function MeetingTable({
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
}: MeetingTableProps) {
  const totalChairs = seats.length;
  const availableSeats = seats.filter((s) => s.isActive && !s.isBooked && !s.isOccupied && !isSlotPast);
  const isAllSelected = totalChairs > 0 && seats.every((s) => selectedSeatIds.includes(s.id));

  // Split chairs into top row and bottom row (or left/right)
  const half = Math.ceil(seats.length / 2);
  const topChairs = seats.slice(0, half);
  const bottomChairs = seats.slice(half);

  const renderChair = (seat: Seat) => {
    const isInactive = !seat.isActive;
    const isBooked = !isInactive && (seat.isBooked || seat.isOccupied);
    const isMyBooking = seat.isMyBooking;
    const isAvailable = !isInactive && !isBooked && !isSlotPast;
    const isSelected = selectedSeatIds.includes(seat.id);

    return (
      <div key={seat.id} className="relative group/chair">
        <button
          type="button"
          disabled={!isAvailable || !isStudent}
          onClick={() => isAvailable && isStudent && onToggleSeat(seat)}
          title={`${seat.seatNumber} (${isBooked ? "Reserved" : isInactive ? "Disabled" : "Available"})`}
          className={`relative h-11 w-11 sm:h-12 sm:w-12 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 border-2 shadow-2xs select-none ${
            isInactive
              ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-50"
              : isMyBooking
              ? "bg-violet-500 border-violet-600 text-white shadow-md ring-2 ring-violet-400/30"
              : isBooked
              ? "bg-rose-50 border-rose-200 text-rose-700 cursor-not-allowed opacity-90"
              : isSelected
              ? "bg-slate-900 border-slate-900 text-white shadow-lg scale-105 ring-3 ring-indigo-500/20"
              : "bg-white border-emerald-300 text-slate-800 hover:border-slate-900 hover:scale-105 hover:shadow-md cursor-pointer"
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
  };

  return (
    <div className="relative flex flex-col items-center p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md transition-all duration-200 group">
      {/* Table Header */}
      <div className="w-full flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 text-xs font-black border border-indigo-100">
            🟦
          </span>
          <div>
            <h4 className="text-xs font-black text-slate-900 tracking-tight">{tableNumber}</h4>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Meeting Desk &bull; {availableSeats.length}/{totalChairs} Free
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

      {/* Meeting Table Container */}
      <div className="flex flex-col items-center gap-3 w-full py-2">
        {/* Top Row Chairs */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
          {topChairs.map(renderChair)}
        </div>

        {/* Central Conference Table Surface */}
        <div className="w-full min-w-[200px] max-w-sm h-16 rounded-2xl bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 border-2 border-slate-300 flex items-center justify-between px-4 shadow-inner relative overflow-hidden">
          {/* Surface details */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
            <Monitor className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-[10px] font-mono">HDMI / Outlets</span>
          </div>

          <div className="text-center">
            <span className="text-xs font-black text-slate-900 block">{tableNumber}</span>
            <span
              className={`text-[9px] font-extrabold px-2 py-0.2 rounded-full inline-block ${
                availableSeats.length > 0
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {availableSeats.length > 0 ? `${availableSeats.length} Available` : "Full"}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span>⚡ Power</span>
          </div>
        </div>

        {/* Bottom Row Chairs */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
          {bottomChairs.map(renderChair)}
        </div>
      </div>
    </div>
  );
}
