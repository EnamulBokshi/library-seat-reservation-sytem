"use client";

import React from "react";
import { MapPin } from "lucide-react";

interface StaffMember {
  name: string;
  role: string;
  specialty: string;
  desk: string;
  avatar: string;
  status: "Available" | "In Consultation";
}

const STAFF_ON_DUTY: StaffMember[] = [
  {
    name: "Dr. Eleanor Vance",
    role: "Head Research Librarian",
    specialty: "Academic Archives, Literature & Citation Advising",
    desk: "Desk 01 • Central Atrium",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
    status: "Available",
  },
  {
    name: "Marcus Sterling",
    role: "Digital Systems Specialist",
    specialty: "Lab Workstations, Cloud Printing & IT Support",
    desk: "Desk 04 • Computer Zone",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    status: "Available",
  },
  {
    name: "Aisha Patel",
    role: "Student Learning Consultant",
    specialty: "Study Strategies, Group Reservations & Accessibility",
    desk: "Desk 02 • East Lounge",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80",
    status: "In Consultation",
  },
];

export function StaffOnDuty() {
  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="kicker-label">HELP DESK & CONSULTATION</span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Library Staff on Duty Today
          </h2>
        </div>
        <span className="text-xs text-slate-500 font-semibold">
          Visit our central reference desk or connect in person
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STAFF_ON_DUTY.map((staff, idx) => (
          <div
            key={idx}
            className="pulse-card p-5 flex items-start gap-3.5 hover:shadow-md transition-all"
          >
            <img
              src={staff.avatar}
              alt={staff.name}
              className="h-12 w-12 rounded-2xl object-cover border border-slate-200 shrink-0 shadow-2xs"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-900 truncate">{staff.name}</h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase border ${
                    staff.status === "Available"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-amber-50 border-amber-200 text-amber-700"
                  }`}
                >
                  {staff.status}
                </span>
              </div>

              <p className="text-[11px] font-bold text-slate-500">{staff.role}</p>
              <p className="text-[11px] text-slate-400 line-clamp-2">{staff.specialty}</p>

              <div className="pt-2 flex items-center gap-1.5 text-[10px] font-bold text-indigo-700">
                <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                <span>{staff.desk}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default StaffOnDuty;
