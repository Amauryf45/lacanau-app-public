"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useParticipants } from "@/lib/hooks";
import { getSession } from "@/lib/session";
import { Sheet } from "@/components/ui";
import type { Participant } from "@/lib/types";

/** Routes encore accessibles quand l'accès est restreint. */
const ALLOWED_PATHS = ["/", "/repas", "/onboarding"];

export function useMyRestriction(): { restricted: boolean; me: Participant | null } {
  const { data: participants } = useParticipants();
  const session = typeof window !== "undefined" ? getSession() : null;
  const me = participants?.find((p) => p.id === session?.participantId) ?? null;
  return { restricted: !!me?.restricted, me };
}

export function restrictionText(p: Pick<Participant, "name" | "restricted_reason">, own: boolean): string {
  const reason = p.restricted_reason ?? "a enfreint les règles de la semaine";
  return own
    ? `Tu as perdu l'accès à l'app : tu ${reason.replace("est allé", "es allé").replace("n'a pas", "n'as pas")}. Sanction de l'orga : seules les courses restent accessibles, jusqu'à nouvel ordre. Pour faire appel, adresse-toi à l'orga (un plaidoyer accompagné d'un apéro a plus de chances d'aboutir).`
    : `${p.name} ${reason}. Sanction de l'orga : son accès à l'app est restreint aux courses, jusqu'à nouvel ordre. ⚖️`;
}

/** Popup d'explication de la sanction. */
export function RestrictionPopup({
  open,
  onClose,
  text,
}: {
  open: boolean;
  onClose: () => void;
  text: string;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="⛔ Accès restreint">
      <p className="font-semibold text-slate-600">{text}</p>
      <button onClick={onClose} className="btn-primary mt-4 w-full">
        Compris
      </button>
    </Sheet>
  );
}

/** Bandeau pour l'utilisateur sanctionné, avec popup au clic. */
export function RestrictionBanner() {
  const { restricted, me } = useMyRestriction();
  const [open, setOpen] = useState(false);
  if (!restricted || !me) return null;
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mx-4 mt-3 block w-[calc(100%-2rem)] rounded-2xl border border-rose-300 bg-rose-50 p-3 text-left"
      >
        <p className="font-black text-rose-700">⛔ Ton accès est restreint</p>
        <p className="text-sm font-semibold text-rose-500">
          Seules les courses te sont accessibles. Touche pour savoir pourquoi.
        </p>
      </button>
      <RestrictionPopup open={open} onClose={() => setOpen(false)} text={restrictionText(me, true)} />
    </>
  );
}

/**
 * Garde globale : si l'utilisateur est restreint et sort des routes autorisées,
 * on remplace la page par l'écran de sanction.
 */
export default function AccessGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { restricted, me } = useMyRestriction();

  if (!restricted || !me || ALLOWED_PATHS.includes(pathname)) return <>{children}</>;

  return (
    <main className="flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center">
      <p className="text-6xl">⛔</p>
      <h1 className="mt-4 text-2xl font-black text-slate-800">Accès restreint</h1>
      <p className="mt-3 font-semibold text-slate-500">{restrictionText(me, true)}</p>
      <Link href="/repas" className="btn-primary mt-6 w-full">
        🛒 Aller aux courses
      </Link>
      <Link href="/" className="mt-3 text-sm font-bold text-slate-400">
        ← Retour à l&apos;accueil
      </Link>
    </main>
  );
}
