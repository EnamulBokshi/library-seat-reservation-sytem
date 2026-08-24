"use client";

import React, { useState, useMemo } from "react";
import { Heart } from "lucide-react";

interface StudentMoment {
  id: string;
  category: "all" | "deep_work" | "collab" | "late_night" | "reading";
  title: string;
  author: string;
  authorRole: string;
  location: string;
  timeAgo: string;
  image: string;
  likes: number;
  tags: string[];
}

const STUDENT_MOMENTS: StudentMoment[] = [
  {
    id: "m1",
    category: "deep_work",
    title: "Finals crunch in the Silent Study Sanctuary — zero distractions, pure focus.",
    author: "Liam K.",
    authorRole: "Computer Science '27",
    location: "Silent Zone • Desk A-04",
    timeAgo: "1h ago",
    image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80",
    likes: 24,
    tags: ["#DeepFocus", "#Algorithms", "#QuietSanctuary"],
  },
  {
    id: "m2",
    category: "collab",
    title: "Brainstorming AI system architecture on the interactive whiteboard with the team.",
    author: "Sophia R. & David M.",
    authorRole: "Software Engineering",
    location: "Group Study Zone • Pod B",
    timeAgo: "3h ago",
    image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80",
    likes: 38,
    tags: ["#CollabSprint", "#Architecture", "#Whiteboard"],
  },
  {
    id: "m3",
    category: "reading",
    title: "Golden hour lighting by the massive floor-to-ceiling windows with a good journal.",
    author: "Elena T.",
    authorRole: "Literature & Arts",
    location: "Reading Zone • Armchair 08",
    timeAgo: "5h ago",
    image: "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?auto=format&fit=crop&w=800&q=80",
    likes: 52,
    tags: ["#ReadingNook", "#GoldenHour", "#CozyVibes"],
  },
  {
    id: "m4",
    category: "late_night",
    title: "Late night lab session — high-speed monitors and dual-screen workflow setup.",
    author: "Tariq A.",
    authorRole: "Data Science",
    location: "Computer Zone • Station C-12",
    timeAgo: "Yesterday",
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80",
    likes: 31,
    tags: ["#LateNightLab", "#DualMonitors", "#DataSprint"],
  },
];

const MOMENT_TABS = [
  { id: "all", label: "All Moments" },
  { id: "deep_work", label: "Deep Work" },
  { id: "collab", label: "Collab Sprints" },
  { id: "reading", label: "Reading Nooks" },
  { id: "late_night", label: "Late Night" },
];

export function StudentMoments() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [likedMoments, setLikedMoments] = useState<Record<string, boolean>>({});

  const filteredMoments = useMemo(() => {
    if (selectedCategory === "all") return STUDENT_MOMENTS;
    return STUDENT_MOMENTS.filter((m) => m.category === selectedCategory);
  }, [selectedCategory]);

  const toggleLike = (id: string) => {
    setLikedMoments((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="kicker-label">CAMPUS LIFE & MOMENTS</span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Student Study Moments & Vibe
          </h2>
        </div>

        {/* Filter Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {MOMENT_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 ${
                selectedCategory === tab.id
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Moments Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredMoments.map((moment) => {
          const isLiked = likedMoments[moment.id];
          const likeCount = moment.likes + (isLiked ? 1 : 0);

          return (
            <div
              key={moment.id}
              className="pulse-card overflow-hidden group flex flex-col justify-between hover:shadow-md transition-all duration-200"
            >
              <div className="relative aspect-4/3 overflow-hidden bg-slate-900">
                <img
                  src={moment.image}
                  alt={moment.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-2.5 left-2.5">
                  <span className="rounded-full bg-slate-900/70 px-2 py-0.5 text-[9px] font-extrabold uppercase text-white backdrop-blur-md">
                    {moment.location}
                  </span>
                </div>

                <button
                  onClick={() => toggleLike(moment.id)}
                  className={`absolute top-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-md transition-all active:scale-90 ${
                    isLiked
                      ? "bg-rose-500 text-white shadow-md"
                      : "bg-slate-900/60 text-white hover:bg-slate-900/80"
                  }`}
                  title="Like moment"
                >
                  <Heart className={`h-3.5 w-3.5 ${isLiked ? "fill-white" : ""}`} />
                </button>
              </div>

              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800 leading-snug">
                    &ldquo;{moment.title}&rdquo;
                  </p>

                  <div className="flex flex-wrap gap-1 mt-2">
                    {moment.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-extrabold text-indigo-600 hover:underline cursor-pointer"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <div>
                    <span className="font-extrabold text-slate-700">{moment.author}</span>
                    <span className="block text-[10px] text-slate-400">{moment.authorRole}</span>
                  </div>
                  <span className="font-semibold flex items-center gap-1">
                    <Heart className="h-3 w-3 text-rose-500 fill-rose-500" />
                    <span>{likeCount}</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default StudentMoments;
