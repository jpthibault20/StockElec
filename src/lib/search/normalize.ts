// Text normalization shared by the search index and the query parser.

// Lower case, no accents, µ → u, punctuation as spaces: "Résistance 4,7µF" → "resistance 4,7uf".
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[µμ]/g, "u")
    .replace(/Ω|ω/g, "ohm")
    .replace(/[^a-z0-9.,+/#\s-]/g, " ")
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Letters and digits only, for references and packages: "SOT-23" → "sot23".
export function compactCode(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// Plural-insensitive word: "resistances" → "resistance".
export function singular(word: string): string {
  return word.length > 3 && word.endsWith("s") ? word.slice(0, -1) : word;
}

// Optimal string alignment distance (Levenshtein + adjacent transpositions),
// stopping early once `max` is exceeded.
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, (_, i) => [i, ...new Array<number>(cols - 1).fill(0)]);
  for (let j = 1; j < cols; j++) d[0][j] = j;
  for (let i = 1; i < rows; i++) {
    let rowMin = Infinity;
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
      rowMin = Math.min(rowMin, d[i][j]);
    }
    if (rowMin > max) return max + 1;
  }
  return d[rows - 1][cols - 1];
}

// Typos allowed for a query word of this length.
export function allowedTypos(length: number): number {
  if (length >= 8) return 2;
  if (length >= 4) return 1;
  return 0;
}
