const CANDIDATE_PATHS = [
  "/",
  "/a-propos",
  "/about",
  "/qui-sommes-nous",
  "/offres",
  "/services",
  "/prestations",
  "/tarifs",
  "/contact",
];

const MAX_CHARS_PER_PAGE = 8000;
const MAX_TOTAL_CHARS = 30000;
const FETCH_TIMEOUT_MS = 10000;

export type ScrapedPage = { url: string; text: string };

export type ScrapeResult = {
  pages: ScrapedPage[];
  errors: string[];
};

function normalizeBaseUrl(input: string): string {
  const trimmed = input.trim();
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  // Retire un éventuel chemin : on repart de la racine du domaine.
  const parsed = new URL(withScheme);
  return `${parsed.protocol}//${parsed.host}`;
}

/** Extraction texte simple : suffisant pour donner du contexte à Claude. */
export function htmlToText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)\s*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&eacute;/gi, "é")
    .replace(/&egrave;/gi, "è")
    .replace(/&agrave;/gi, "à")
    .replace(/&ccedil;/gi, "ç")
    .replace(/[ \t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
      headers: {
        "User-Agent": "CalendrierEditorialKMI/1.0 (+analyse interne de marque)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Récupère le texte des pages clés d'un site.
 * Les pages absentes sont simplement ignorées (404 attendus sur les variantes d'URL).
 */
export async function scrapeSite(websiteUrl: string): Promise<ScrapeResult> {
  let base: string;
  try {
    base = normalizeBaseUrl(websiteUrl);
  } catch {
    return { pages: [], errors: [`URL invalide : ${websiteUrl}`] };
  }

  const results = await Promise.all(
    CANDIDATE_PATHS.map(async (path) => {
      const url = `${base}${path}`;
      const html = await fetchPage(url);
      if (!html) return null;
      const text = htmlToText(html);
      if (text.length < 200) return null;
      return { url, text: text.slice(0, MAX_CHARS_PER_PAGE) };
    }),
  );

  const pages: ScrapedPage[] = [];
  let total = 0;
  const seen = new Set<string>();

  for (const page of results) {
    if (!page) continue;
    // Beaucoup de sites renvoient la même page pour /about et /a-propos.
    const fingerprint = page.text.slice(0, 400);
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);

    if (total + page.text.length > MAX_TOTAL_CHARS) {
      pages.push({ ...page, text: page.text.slice(0, MAX_TOTAL_CHARS - total) });
      break;
    }
    pages.push(page);
    total += page.text.length;
  }

  const errors =
    pages.length === 0
      ? [
          `Aucun contenu exploitable récupéré sur ${base}. Le site est peut-être injoignable, protégé, ou entièrement rendu en JavaScript.`,
        ]
      : [];

  return { pages, errors };
}

export function formatScrapedPages(pages: ScrapedPage[]): string {
  return pages
    .map((page) => `### Page : ${page.url}\n\n${page.text}`)
    .join("\n\n---\n\n");
}
