"use client";

import { useEffect, useState } from "react";

const KEY = "lacanau_profile";

/** Profil visiteur : lecture seule, pas de participant en base. */
export const VISITOR_ID = "visitor";

export type Session = {
  participantId: string;
  name: string;
};

export function isVisitor(session: Session | null): boolean {
  return session?.participantId === VISITOR_ID;
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function setSession(s: Session) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

/**
 * Session hook : redirige vers /onboarding si aucun profil choisi.
 * `session` est null pendant l'hydratation puis sur les pages sans profil.
 */
export function useSession(): { session: Session | null; ready: boolean } {
  const [session, setState] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Lien direct « ?as=<participantId> » : sélectionne le profil sans passer par l'onboarding.
    const params = new URLSearchParams(window.location.search);
    const as = params.get("as");
    if (as && /^[0-9a-f-]{36}$/.test(as)) {
      setSession({ participantId: as, name: "" });
      params.delete("as");
      const search = params.toString();
      window.history.replaceState(null, "", window.location.pathname + (search ? `?${search}` : ""));
    }

    const s = getSession();
    setState(s);
    setReady(true);
    if (!s && window.location.pathname !== "/onboarding") {
      window.location.href = "/onboarding";
    }
  }, []);

  return { session, ready };
}
