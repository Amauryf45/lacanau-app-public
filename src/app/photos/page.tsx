"use client";

import { useMemo, useState } from "react";
import { isVisitor, useSession } from "@/lib/session";
import { useParticipants, usePhotoComments, usePhotoReactions, usePhotos } from "@/lib/hooks";
import { supabase } from "@/lib/supabase";
import { uploadPhoto } from "@/lib/upload";
import { EmptyState, PageHeader, Sheet, Spinner } from "@/components/ui";
import { VLOG_DRIVE_URL, displayName } from "@/lib/types";
import { formatRelative } from "@/lib/dates";
import type { Photo } from "@/lib/types";

async function downloadPhoto(photo: Photo) {
  try {
    const res = await fetch(photo.url);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lacanau-${photo.id.slice(0, 8)}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    window.open(photo.url, "_blank");
  }
}

const REACTIONS = ["❤️", "😂", "😍", "😱", "🔥"];

export default function PhotosPage() {
  const { session, ready } = useSession();
  const { data: photos, mutate } = usePhotos();
  const { data: participants } = useParticipants();
  const { data: comments, mutate: mutateComments } = usePhotoComments();
  const { data: reactions, mutate: mutateReactions } = usePhotoReactions();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  const byId = useMemo(() => new Map((participants ?? []).map((p) => [p.id, p])), [participants]);
  const commentCountByPhoto = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of comments ?? []) map.set(c.photo_id, (map.get(c.photo_id) ?? 0) + 1);
    return map;
  }, [comments]);

  if (!ready || !session) return <Spinner />;
  if (!photos) return <Spinner />;

  const myId = session.participantId;
  const visitor = isVisitor(session);
  const myReactions = new Set(
    (reactions ?? []).filter((r) => r.participant_id === myId).map((r) => `${r.photo_id}:${r.emoji}`)
  );

  async function toggleReaction(photo: Photo, emoji: string) {
    if (visitor) return;
    if (myReactions.has(`${photo.id}:${emoji}`)) {
      await supabase.from("photo_reactions").delete().match({ photo_id: photo.id, participant_id: myId, emoji });
    } else {
      await supabase.from("photo_reactions").insert({ photo_id: photo.id, participant_id: myId, emoji });
    }
    mutateReactions();
  }

  async function sendComment(photo: Photo) {
    const content = commentDraft.trim();
    if (!content || sendingComment) return;
    setSendingComment(true);
    const { error } = await supabase.from("photo_comments").insert({
      photo_id: photo.id,
      participant_id: myId,
      content,
    });
    if (error) alert(error.message);
    setCommentDraft("");
    await mutateComments();
    setSendingComment(false);
  }

  return (
    <main>
      <PageHeader emoji="📸" title="Photos" subtitle="Les souvenirs de la semaine, en vrac." />

      <div className="mx-4 mb-4 space-y-2">
        {!visitor && (
          <button onClick={() => setUploadOpen(true)} className="btn-primary w-full">
            📷 Ajouter des photos
          </button>
        )}
        <a href={VLOG_DRIVE_URL} target="_blank" rel="noreferrer" className="btn-ghost w-full">
          🎥 Vidéos du vlog → Drive
        </a>
      </div>

      {photos.length === 0 ? (
        <EmptyState emoji="🌅" text="Aucune photo pour l'instant. À toi de jouer !" />
      ) : (
        <div className="mx-4 grid grid-cols-3 gap-1.5">
          {photos.map((photo) => {
            const nbComments = commentCountByPhoto.get(photo.id) ?? 0;
            return (
              <button key={photo.id} onClick={() => setLightbox(photo)} className="relative aspect-square overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={photo.caption ?? "Photo"} loading="lazy" className="h-full w-full object-cover" />
                {nbComments > 0 && (
                  <span className="absolute bottom-1 right-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-black text-white">
                    💬 {nbComments}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <UploadSheet
        open={uploadOpen}
        myId={session.participantId}
        onClose={() => setUploadOpen(false)}
        onDone={() => {
          setUploadOpen(false);
          mutate();
        }}
      />

      {lightbox && (
        <div className="fixed inset-0 z-50 flex h-dvh flex-col bg-black/95">
          <div
            className="flex min-h-0 flex-1 items-center justify-center p-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
            onClick={() => setLightbox(null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.url}
              alt={lightbox.caption ?? "Photo"}
              className="h-full w-full rounded-lg object-contain"
            />
          </div>

          <div className="max-h-[45dvh] shrink-0 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-white">
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 text-sm text-white/70">
                {lightbox.caption && <span className="block font-bold text-white">{lightbox.caption}</span>}
                par {lightbox.uploaded_by ? displayName(byId.get(lightbox.uploaded_by) ?? { name: "?", nickname: null }) : "?"} ·{" "}
                {formatRelative(lightbox.created_at)}
              </p>
              <div className="flex shrink-0 gap-1.5">
                <button onClick={() => downloadPhoto(lightbox)} className="rounded-xl bg-white/15 px-3 py-1.5 text-sm font-bold">
                  ⬇️
                </button>
                <button onClick={() => setLightbox(null)} className="rounded-xl bg-white/15 px-3 py-1.5 text-sm font-bold">
                  ✕
                </button>
              </div>
            </div>

            <div className="mt-2 flex gap-1.5">
              {REACTIONS.map((emoji) => {
                const count = (reactions ?? []).filter((r) => r.photo_id === lightbox.id && r.emoji === emoji).length;
                const mine = myReactions.has(`${lightbox.id}:${emoji}`);
                return (
                  <button
                    key={emoji}
                    onClick={() => toggleReaction(lightbox, emoji)}
                    className={`rounded-full px-2 py-1 text-sm font-bold transition active:scale-110 ${
                      mine ? "bg-ocean-600" : count > 0 ? "bg-white/15" : "bg-white/5 opacity-60"
                    }`}
                  >
                    {emoji}
                    {count > 0 && <span className="ml-1 text-xs">{count}</span>}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 space-y-2">
              {(comments ?? [])
                .filter((c) => c.photo_id === lightbox.id)
                .map((c) => {
                  const author = byId.get(c.participant_id);
                  return (
                    <p key={c.id} className="text-sm">
                      <span className="font-black">
                        {author?.emoji} {author ? displayName(author) : "?"}
                      </span>{" "}
                      <span className="text-white/80">{c.content}</span>
                      <span className="ml-1 text-[10px] font-bold text-white/40">{formatRelative(c.created_at)}</span>
                    </p>
                  );
                })}
            </div>

            <div className={`mt-3 flex items-center gap-2 ${visitor ? "hidden" : ""}`}>
              <input
                className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-white/50"
                placeholder="Ajouter un commentaire…"
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendComment(lightbox)}
                maxLength={300}
              />
              <button
                onClick={() => sendComment(lightbox)}
                disabled={!commentDraft.trim() || sendingComment}
                className="shrink-0 rounded-xl bg-ocean-600 px-3 py-2 text-sm font-bold disabled:opacity-40"
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function UploadSheet({
  open,
  myId,
  onClose,
  onDone,
}: {
  open: boolean;
  myId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  async function submit() {
    if (files.length === 0) {
      setError("Choisis au moins une photo 😄");
      return;
    }
    setBusy(true);
    setError("");
    try {
      for (let i = 0; i < files.length; i++) {
        setProgress(i + 1);
        const url = await uploadPhoto(files[i], "galerie");
        const { error } = await supabase.from("photos").insert({
          url,
          caption: caption.trim() || null,
          uploaded_by: myId,
        });
        if (error) throw new Error(error.message);
      }
      setFiles([]);
      setCaption("");
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur d'upload");
    } finally {
      setBusy(false);
      setProgress(0);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Ajouter des photos 📷">
      <label className="btn-ghost w-full cursor-pointer">
        🖼️ {files.length > 0 ? `${files.length} photo${files.length > 1 ? "s" : ""} sélectionnée${files.length > 1 ? "s" : ""}` : "Choisir des photos"}
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        />
      </label>
      <input
        className="input mt-3"
        placeholder="Légende commune (optionnel)"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        maxLength={120}
      />
      {error && <p className="mt-2 text-sm font-bold text-rose-600">{error}</p>}
      <button onClick={submit} disabled={busy} className="btn-primary mt-4 w-full">
        {busy ? `Envoi ${progress}/${files.length}…` : "Partager 🌊"}
      </button>
    </Sheet>
  );
}
