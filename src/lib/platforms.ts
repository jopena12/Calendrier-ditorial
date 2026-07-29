import type { Platform, PostStatus } from "./types";

export const PLATFORMS: Platform[] = [
  "linkedin",
  "instagram",
  "facebook",
  "tiktok",
];

type PlatformMeta = {
  label: string;
  short: string;
  color: string;
  /** Consignes de format injectées dans le prompt de génération. */
  brief: string;
};

export const PLATFORM_META: Record<Platform, PlatformMeta> = {
  linkedin: {
    label: "LinkedIn",
    short: "IN",
    color: "#0a66c2",
    brief: [
      "Format LinkedIn : post professionnel, 900 à 1600 caractères.",
      "Première ligne = accroche forte qui donne envie de cliquer sur « voir plus » (pas de hashtag, pas d'emoji dedans).",
      "Paragraphes courts séparés par des sauts de ligne, aucun titre markdown, aucun gras.",
      "Ton expert et concret : angle métier, chiffres, retour d'expérience. Zéro langue de bois.",
      "Emojis : très rares (0 à 2 maximum), jamais en début de ligne systématique.",
      "Termine par une question ouverte ou un CTA simple.",
      "3 à 5 hashtags, en fin de post, orientés secteur/métier.",
    ].join("\n"),
  },
  instagram: {
    label: "Instagram",
    short: "IG",
    color: "#d62976",
    brief: [
      "Format Instagram : légende de 500 à 1000 caractères.",
      "Première phrase = accroche visuelle et émotionnelle (les 125 premiers caractères sont visibles avant « plus »).",
      "Ton chaleureux, incarné, direct, on tutoie ou on parle à « vous » selon la marque.",
      "Emojis bienvenus mais dosés (3 à 6), utilisés pour aérer le texte.",
      "Sauts de ligne fréquents, aucun titre markdown.",
      "CTA orienté interaction : commentaire, enregistrement, DM, lien en bio.",
      "8 à 12 hashtags mêlant hashtags de niche et hashtags locaux/génériques.",
    ].join("\n"),
  },
  facebook: {
    label: "Facebook",
    short: "FB",
    color: "#1877f2",
    brief: [
      "Format Facebook : post de 400 à 800 caractères.",
      "Ton accessible et convivial, orienté grand public et communauté locale.",
      "Phrases simples, une idée par paragraphe, pas de jargon.",
      "Emojis modérés (2 à 4).",
      "Informations pratiques valorisées si elles existent (date, lieu, prix, contact).",
      "CTA clair : message privé, appel, réservation, partage.",
      "2 à 4 hashtags maximum (Facebook ne les valorise pas).",
    ].join("\n"),
  },
  tiktok: {
    label: "TikTok",
    short: "TT",
    color: "#010101",
    brief: [
      "Format TikTok : le champ `content` doit contenir DEUX blocs, dans cet ordre :",
      "1) « SCRIPT VIDÉO » — un script court de 20 à 40 secondes découpé en séquences (Hook 0-3s, puis 2 à 4 beats, puis chute/CTA), avec ce qui est dit à l'oral.",
      "2) « LÉGENDE » — la légende à coller sous la vidéo, 100 à 200 caractères, punchy.",
      "Ton très direct, rythmé, parlé, comme à l'oral. Aucune formule corporate.",
      "Le hook des 3 premières secondes doit créer une tension ou une curiosité immédiate.",
      "3 à 6 hashtags courts et populaires liés au sujet.",
    ].join("\n"),
  },
};

export const OBJECTIVES = [
  { value: "informer", label: "Informer" },
  { value: "vendre", label: "Vendre" },
  { value: "engager", label: "Engager" },
  { value: "recruter", label: "Recruter" },
  { value: "inspirer", label: "Inspirer" },
] as const;

export const STATUS_META: Record<
  PostStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Brouillon",
    className: "bg-slate-100 text-slate-700 ring-slate-300",
  },
  valide: {
    label: "Validé",
    className: "bg-amber-100 text-amber-800 ring-amber-300",
  },
  publie: {
    label: "Publié",
    className: "bg-emerald-100 text-emerald-800 ring-emerald-300",
  },
};

export const STATUSES: PostStatus[] = ["draft", "valide", "publie"];

export function isPlatform(value: string): value is Platform {
  return (PLATFORMS as string[]).includes(value);
}
