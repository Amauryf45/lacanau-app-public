"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RestrictionPopup, restrictionText, useMyRestriction } from "@/components/restriction";

const TABS = [
  { href: "/", label: "Accueil", emoji: "🏖️" },
  { href: "/chat", label: "Chat", emoji: "💬" },
  { href: "/planning", label: "Planning", emoji: "📅" },
  { href: "/photos", label: "Photos", emoji: "📸" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { restricted, me } = useMyRestriction();
  const [popupOpen, setPopupOpen] = useState(false);
  if (pathname === "/onboarding") return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-ocean-100 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-lg grid grid-cols-4">
        {TABS.map((tab) => {
          const active =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          const blocked = restricted && tab.href !== "/";
          if (blocked) {
            return (
              <button
                key={tab.href}
                onClick={() => setPopupOpen(true)}
                className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold text-slate-300"
              >
                <span className="text-xl grayscale opacity-30">{tab.emoji}</span>
                {tab.label}
              </button>
            );
          }
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold transition ${
                active ? "text-ocean-700" : "text-slate-400"
              }`}
            >
              <span className={`text-xl transition ${active ? "scale-110" : "grayscale opacity-60"}`}>
                {tab.emoji}
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
      {me && (
        <RestrictionPopup open={popupOpen} onClose={() => setPopupOpen(false)} text={restrictionText(me, true)} />
      )}
    </nav>
  );
}
