import Link from "next/link";
import { PageHeader } from "@/components/ui";

const SECTIONS: { emoji: string; title: string; lines: string[] }[] = [
  {
    emoji: "🎯",
    title: "Quêtes",
    lines: [
      "30 quêtes t'attendent : 🌱 soft (10 pts), 🤪 fun (20 pts), 🌶️ épicé (30 pts).",
      "Tu l'as faite ? Envoie une preuve (récit + photo). Les autres votent : à 3 votes, la majorité décide.",
      "Tu peux proposer tes propres quêtes (25 pts pour qui les relève).",
    ],
  },
  {
    emoji: "🔥",
    title: "Défis",
    lines: [
      "Défie qui tu veux, sur ce que tu veux. 25 pts si c'est réussi.",
      "Le défié accepte (💪 chiche) ou refuse (🙅 pas chiche). Preuve + votes, comme les quêtes.",
    ],
  },
  {
    emoji: "🎭",
    title: "Notes anonymes",
    lines: [
      "Potins, déclarations, taquineries — personne ne sait qui a écrit quoi.",
      "Chacun a UN joker 🃏 pour toute la semaine : il révèle l'auteur d'une note, aux yeux de tous. Choisis bien.",
    ],
  },
  {
    emoji: "🗳️",
    title: "Sondages",
    lines: [
      "« Qui est le plus susceptible de… ? » Crée, vote, change ton vote. Un seul vote par personne.",
    ],
  },
  {
    emoji: "📅",
    title: "Planning",
    lines: [
      "Propose des activités, dis si tu es partant 🙋 ou pas 😴.",
      "L'orga confirme et ça atterrit au planning du jour.",
    ],
  },
  {
    emoji: "📸",
    title: "Photos",
    lines: ["Balance tes photos de la semaine, tout le monde peut les télécharger — et les commenter."],
  },
  {
    emoji: "🍽️",
    title: "Repas",
    lines: [
      "Chaque équipe cuisine un déj et un dîner (créneaux tirés au sort, visibles dans le planning).",
      "Renseigne ton plat et sa liste de courses — cochable par tout le monde, pratique au supermarché.",
    ],
  },
  {
    emoji: "💬",
    title: "Chat",
    lines: ["Le QG. Tape sur un message pour réagir avec un emoji."],
  },
  {
    emoji: "🔪",
    title: "Killer",
    lines: [
      "Chacun a une cible secrète et une mission : lui faire faire une action précise sans qu'elle s'en rende compte.",
      "Mission accomplie ? Déclare ton kill — ta victime confirme (sans savoir qui l'a eue) et tu hérites de sa cible.",
      "Elle conteste ? L'admin tranche. Le dernier survivant gagne, et toute l'histoire est révélée à la fin.",
    ],
  },
  {
    emoji: "🏆",
    title: "Classement",
    lines: [
      "Quêtes validées + défis réussis = points. Le trône se joue à la loyale (ou presque).",
    ],
  },
];

export default function ReglesPage() {
  return (
    <main>
      <PageHeader
        emoji="❓"
        title="Les règles du jeu"
        subtitle="Une semaine, 13 joueurs, zéro pitié."
      />
      <section className="mx-4 space-y-3">
        {SECTIONS.map((s) => (
          <div key={s.title} className="card">
            <h2 className="font-black text-slate-800">
              {s.emoji} {s.title}
            </h2>
            <ul className="mt-1.5 space-y-1">
              {s.lines.map((line) => (
                <li key={line} className="text-sm font-semibold text-slate-600">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="card !bg-ocean-50">
          <h2 className="font-black text-slate-800">📲 Astuce</h2>
          <p className="mt-1.5 text-sm font-semibold text-slate-600">
            Ajoute l&apos;app à ton écran d&apos;accueil : Safari/Chrome → Partager →
            « Sur l&apos;écran d&apos;accueil ». Et hop, une vraie app.
          </p>
        </div>

        <Link href="/" className="btn-primary w-full">
          C&apos;est parti 🏄
        </Link>
      </section>
    </main>
  );
}
