import type { MangaVolume } from "@/data/manga";

/**
 * Catalogue search.
 *
 * Every search box on the site funnels through here, so they all behave the
 * same way. What it replaces was `title.includes(query)` copied into two
 * components: no ranking, so an exact title could sit below an incidental
 * genre match; no multi-word support, so "jujutsu 5" found nothing; no
 * tolerance for a slip of the finger; and nothing for a shopper typing Arabic.
 */

/** Weight per field. A hit in the title should outrank a hit in a synopsis. */
const FIELD_WEIGHTS = {
  title: 100,
  seriesTitle: 70,
  aliases: 70,
  author: 50,
  artist: 40,
  genre: 35,
  japaneseTitle: 30,
  format: 20,
  isbn: 60,
  synopsis: 10,
} as const;

type FieldName = keyof typeof FIELD_WEIGHTS;

/**
 * Folds a string to its comparable form.
 *
 * NFKD splits a letter from its marks, and every mark is then dropped — Latin
 * accents and Arabic tashkeel alike. Dropping them by Unicode category rather
 * than by codepoint range matters: decomposing "أ" yields a bare alif plus a
 * hamza that lives in the Arabic block, and a Latin-only strip left it behind
 * to be punched out as a space, turning "أكشن" into two words.
 */
export function normalizeText(input: unknown): string {
  return String(input ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/ـ/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Splits a query into the terms that must all be satisfied. */
export function tokenize(query: string): string[] {
  const normalized = normalizeText(query);
  return normalized ? normalized.split(" ").filter(Boolean) : [];
}

/**
 * Levenshtein distance, abandoned as soon as it exceeds `max`.
 *
 * Bailing out early keeps a per-keystroke pass over the catalogue cheap: most
 * candidates are rejected after a row or two instead of filling a whole matrix.
 */
function boundedEditDistance(a: string, b: string, max: number): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowBest = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
      current.push(value);
      if (value < rowBest) rowBest = value;
    }
    if (rowBest > max) return max + 1;
    previous = current;
  }
  return previous[b.length];
}

/** How much typo tolerance a term of this length earns. */
function allowedTypos(term: string): number {
  if (term.length <= 3) return 0;
  if (term.length <= 6) return 1;
  return 2;
}

/** Literal scoring only. Returns 0 when the term is nowhere in the field. */
function scoreLiteral(term: string, field: IndexedField): number {
  const { value, words } = field;

  if (value === term) return 2.0;
  if (value.startsWith(term)) return 1.5;

  for (const word of words) {
    if (word === term) return 1.6;
    if (word.startsWith(term)) return 1.3;
  }

  return value.includes(term) ? 1.0 : 0;
}

/** Near-miss scoring, used only when nothing matched literally anywhere. */
function scoreFuzzy(term: string, field: IndexedField, budget: number): number {
  for (const word of field.words) {
    if (Math.abs(word.length - term.length) > budget) continue;
    if (boundedEditDistance(word, term, budget) <= budget) return 0.55;
  }
  return 0;
}

interface IndexedField {
  name: FieldName;
  value: string;
  /** Pre-split at index time; splitting per keystroke dominated the cost. */
  words: string[];
  /** Long prose is matched literally only — fuzzy over it is slow and noisy. */
  fuzzy: boolean;
}

interface IndexedItem<T> {
  item: T;
  fields: IndexedField[];
  volumeNumber: number | null;
}

/** Only short, identifying fields are worth a typo search. */
const FUZZY_FIELDS = new Set<FieldName>(["title", "seriesTitle", "aliases", "author", "artist", "genre"]);

/**
 * Builds the normalised, searchable form of a catalogue. Callers should hold
 * this across keystrokes — normalising every field on every keypress is the
 * expensive part, and it does not change while the shopper types.
 */
export function buildSearchIndex<T extends Partial<MangaVolume>>(items: T[]): IndexedItem<T>[] {
  return items.map((item) => {
    const fields: IndexedField[] = [];

    const push = (name: FieldName, raw: unknown) => {
      const value = normalizeText(raw);
      if (!value) return;
      fields.push({ name, value, words: value.split(" "), fuzzy: FUZZY_FIELDS.has(name) });
    };

    push("title", item.title);
    push("seriesTitle", item.seriesTitle);
    push("author", item.author);
    push("artist", item.artist);
    push("japaneseTitle", item.japaneseTitle);
    push("format", item.format);
    push("isbn", item.isbn);
    push("synopsis", item.synopsis);
    (item.genre || []).forEach((g) => push("genre", g));
    ((item as { aliases?: string[] }).aliases || []).forEach((a) => push("aliases", a));

    const volumeNumber = typeof item.volumeNumber === "number" ? item.volumeNumber : null;

    return { item, fields, volumeNumber };
  });
}

export interface SearchResult<T> {
  item: T;
  score: number;
}

/**
 * Ranks a prepared index against a query.
 *
 * Every term has to match something (an AND, which is what people expect when
 * they add a word to narrow a search); the score is the sum of each term's
 * best field hit, so an exact title beats a passing mention in a synopsis.
 */
export function searchIndex<T>(index: IndexedItem<T>[], query: string): SearchResult<T>[] {
  const terms = tokenize(query);
  if (terms.length === 0) return index.map((entry) => ({ item: entry.item, score: 0 }));

  const results: SearchResult<T>[] = [];

  for (const entry of index) {
    let total = 0;
    let matchedAllTerms = true;

    for (const term of terms) {
      let best = 0;

      // A bare number is almost always a volume number.
      if (entry.volumeNumber !== null && /^\d{1,3}$/.test(term)) {
        if (String(entry.volumeNumber) === String(Number(term))) {
          best = Math.max(best, 1.6 * FIELD_WEIGHTS.title);
        }
      }

      for (const field of entry.fields) {
        const factor = scoreLiteral(term, field);
        if (factor > 0) best = Math.max(best, factor * FIELD_WEIGHTS[field.name]);
      }

      // Typo tolerance is the expensive path, so it runs only when the literal
      // pass came up empty for this term — the common case never pays for it.
      if (best === 0) {
        const budget = allowedTypos(term);
        if (budget > 0) {
          for (const field of entry.fields) {
            if (!field.fuzzy) continue;
            const factor = scoreFuzzy(term, field, budget);
            if (factor > 0) best = Math.max(best, factor * FIELD_WEIGHTS[field.name]);
          }
        }
      }

      if (best === 0) {
        matchedAllTerms = false;
        break;
      }
      total += best;
    }

    if (matchedAllTerms) results.push({ item: entry.item, score: total });
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

/** One-shot convenience for callers that do not hold an index. */
export function searchVolumes<T extends Partial<MangaVolume>>(items: T[], query: string): T[] {
  if (!query.trim()) return items;
  return searchIndex(buildSearchIndex(items), query).map((r) => r.item);
}
