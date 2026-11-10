/**
 * Fige l'état actuel des listes de courses en un « run » trié par rayon.
 * Tous les items sans run reçoivent run = max(run)+1 et une catégorie.
 * Usage : node --env-file=.env.local scripts/create-shopping-run.mjs
 */
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const CATEGORIES = [
  ["legumes", ["tomate", "salade", "laitue", "oignon", "ail", "courgette", "aubergine", "poivron", "carotte", "patate", "pomme de terre", "pommes de terre", "citron", "banane", "peche", "pêche", "melon", "pasteque", "pastèque", "avocat", "concombre", "basilic", "persil", "coriandre", "menthe", "echalote", "échalote", "champignon", "pomme", "fraise", "framboise", "abricot", "raisin", "nectarine", "mais", "maïs", "radis", "betterave", "fruit", "legume", "légume", "gingembre", "brocoli", "epinard", "épinard", "haricot"]],
  ["viande", ["poulet", "boeuf", "bœuf", "steak", "viande", "jambon", "lardon", "saucisse", "chorizo", "merguez", "porc", "dinde", "veau", "agneau", "poisson", "thon", "saumon", "crevette", "knacki", "nugget", "cordon bleu", "bacon", "hache", "haché", "escalope", "rillette", "pate de campagne", "surimi"]],
  ["frais", ["lait", "beurre", "creme", "crème", "yaourt", "fromage", "mozzarella", "mozza", "feta", "parmesan", "oeuf", "œuf", "rape", "râpé", "camembert", "chevre", "chèvre", "comte", "comté", "emmental", "cheddar", "raclette", "burrata", "skyr", "tzatziki", "houmous", "boursin"]],
  ["epicerie", ["pate", "pâte", "riz", "farine", "sucre", "sel", "poivre", "huile", "vinaigre", "sauce", "conserve", "tortilla", "taco", "wrap", "chips", "gateau", "gâteau", "cereale", "céréale", "café", "cafe", "the", "thé", "chocolat", "miel", "confiture", "epice", "épice", "curry", "moutarde", "ketchup", "mayo", "pesto", "olive", "biscuit", "apero", "apéro", "cacahuete", "cacahuète", "semoule", "lentille", "pois chiche", "quinoa", "nouille", "curcuma", "paprika", "cumin", "bouillon", "pain de mie", "biscotte", "compote", "nutella"]],
  ["boulangerie", ["pain", "baguette", "brioche", "croissant", "viennoiserie", "burger bun", "pain burger"]],
  ["boissons", ["eau", "jus", "soda", "coca", "biere", "bière", "vin", "rhum", "vodka", "gin", "whisky", "pastis", "ricard", "alcool", "sirop", "limonade", "ice tea", "oasis", "schweppes", "champagne", "cidre", "monaco"]],
  ["maison", ["pq", "papier toilette", "essuie-tout", "sopalin", "savon", "liquide vaisselle", "eponge", "éponge", "sac poubelle", "lessive", "shampoing", "dentifrice", "creme solaire", "crème solaire", "moustique", "allume", "charbon", "glacon", "glaçon", "gobelet", "serviette", "alu", "cellophane", "film etirable"]],
];

function normalize(s) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function categorize(label) {
  const n = normalize(label);
  for (const [cat, keywords] of CATEGORIES) {
    if (keywords.some((k) => n.includes(normalize(k)))) return cat;
  }
  return "autre";
}

const { data: items } = await supabase.from("meal_items").select("*");
const maxRun = Math.max(0, ...items.filter((i) => i.run != null).map((i) => i.run));
const toAssign = items.filter((i) => i.run == null);
if (toAssign.length === 0) {
  console.log("Rien à figer — tous les items sont déjà dans un run.");
  process.exit(0);
}
const run = maxRun + 1;
const counts = {};
for (const item of toAssign) {
  const category = categorize(item.label);
  counts[category] = (counts[category] ?? 0) + 1;
  const { error } = await supabase.from("meal_items").update({ run, category }).eq("id", item.id);
  if (error) throw new Error(error.message);
}
console.log(`✅ Course ${run} : ${toAssign.length} items figés`, counts);
