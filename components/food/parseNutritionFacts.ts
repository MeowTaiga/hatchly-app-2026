import type { FoodDetail, FoodServing } from '@/lib/api';

const LABEL_HEADER =
  /nutrition\s*facts|nutrition\s*information|informations?\s*nutritionnelles|valeurs\s*nutritionnelles/i;

const MACRO_HINT =
  /protein|prot[eé]ine|total fat|lipides?|carbohydrate|glucides?|total carb/i;

const CALORIE_HINT = /calor(?:ies|ie)|[ée]nergie|energy/i;

function clean(line: string): string {
  return line.replace(/\s+/g, ' ').trim();
}

function toNum(raw: string): number | undefined {
  const n = parseFloat(raw.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function amountWithUnit(text: string, units: RegExp): number | undefined {
  const match = text.match(new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(?:${units.source})\\b`, 'i'));
  return match ? toNum(match[1]) : undefined;
}

function amountOnLine(line: string, label: RegExp, units?: RegExp): number | undefined {
  if (!label.test(line)) return undefined;
  if (units) {
    const withUnit = amountWithUnit(line, units);
    if (withUnit != null) return withUnit;
  }
  const bare = line.match(label);
  if (!bare) return undefined;
  const after = line.slice(bare.index! + bare[0].length);
  if (/%/.test(after) && !/\d+(?:[.,]\d+)?\s*(g|mg|mcg|µg|ug)\b/i.test(after)) {
    return undefined;
  }
  const num = after.match(/(\d+(?:[.,]\d+)?)/);
  return num ? toNum(num[1]) : undefined;
}

function findAcrossLines(
  lines: string[],
  label: RegExp,
  units?: RegExp,
): number | undefined {
  for (let i = 0; i < lines.length; i++) {
    const onLine = amountOnLine(lines[i], label, units);
    if (onLine != null) return onLine;
    if (label.test(lines[i]) && lines[i + 1]) {
      const next = units
        ? amountWithUnit(lines[i + 1], units)
        : toNum(lines[i + 1].match(/(\d+(?:[.,]\d+)?)/)?.[1] ?? '');
      if (next != null) return next;
    }
  }
  return undefined;
}

function servingDescription(lines: string[]): string {
  for (const line of lines) {
    const match = line.match(/serving size\s*[:\-]?\s*(.+)/i)
      || line.match(/portion\s*[:\-]?\s*(.+)/i);
    if (match?.[1]) {
      const desc = clean(match[1].replace(/\b\d+\s*%.*$/, ''));
      if (desc) return desc.slice(0, 48);
    }
  }
  return '1 serving';
}

function productName(lines: string[]): string {
  const headerAt = lines.findIndex((line) => LABEL_HEADER.test(line));
  const before = (headerAt > 0 ? lines.slice(0, headerAt) : []).filter((line) => {
    if (line.length < 3 || line.length > 40) return false;
    if (/^\d/.test(line)) return false;
    if (CALORIE_HINT.test(line) || MACRO_HINT.test(line)) return false;
    if (/per\s+(serving|container)|daily\s+value|%|barcode|upc/i.test(line)) return false;
    return /[a-z]/i.test(line);
  });
  return before.at(-1) || 'Custom food';
}

export function looksLikeNutritionFacts(text: string): boolean {
  if (!LABEL_HEADER.test(text)) return false;
  if (!CALORIE_HINT.test(text)) return false;
  return MACRO_HINT.test(text);
}

export function parseNutritionFacts(text: string, lineList?: string[]): FoodDetail | null {
  const lines = (lineList?.length ? lineList : text.split(/\n+/)).map(clean).filter(Boolean);
  const blob = lines.join('\n');
  if (!looksLikeNutritionFacts(blob)) return null;

  const grams = /g|gram(?:s)?/;
  const milligrams = /mg|milligram(?:s)?/;
  const micrograms = /mcg|µg|ug|mcgs?/;

  const calories = findAcrossLines(lines, /calor(?:ies|ie)s?(?!\s+from)/i)
    ?? findAcrossLines(lines, /(?:energy|[ée]nergie)/i);
  if (calories == null) return null;

  const protein = findAcrossLines(lines, /prot[eé]ines?/i, grams) ?? 0;
  const fat = findAcrossLines(
    lines,
    /(?<!saturated\s)(?<!trans\s)(?:total\s+)?fat\b(?!\s*from)|lipides?(?!\s+trans)/i,
    grams,
  ) ?? 0;
  const carbs = findAcrossLines(lines, /(?:total\s+)?carb(?:ohydrate)?s?|glucides?/i, grams) ?? 0;
  if (calories === 0 && protein === 0 && fat === 0 && carbs === 0) return null;

  const serving: FoodServing = {
    servingId: 'custom-serving',
    description: servingDescription(lines),
    calories,
    protein,
    fat,
    carbs,
    sugar: findAcrossLines(lines, /(?:total\s+)?sugars?|sucres?/i, grams),
    fiber: findAcrossLines(lines, /(?:dietary\s+)?fib(?:er|re)|fibres?/i, grams),
    saturatedFat: findAcrossLines(lines, /saturated\s+fat|satur[eé]s?/i, grams),
    transFat: findAcrossLines(lines, /trans\s+fat|lipides?\s+trans/i, grams),
    addedSugars: findAcrossLines(lines, /added\s+sugars?|sucres?\s+ajout/i, grams),
    sodium: findAcrossLines(lines, /sodium/i, milligrams),
    potassium: findAcrossLines(lines, /potassium/i, milligrams),
    cholesterol: findAcrossLines(lines, /cholesterol|cholest[eé]rol/i, milligrams),
    iron: findAcrossLines(lines, /\biron\b|fer\b/i, milligrams),
    calcium: findAcrossLines(lines, /calcium/i, milligrams),
    vitaminA: findAcrossLines(lines, /vitamin(?:e)?\s*a\b/i, micrograms),
    vitaminC: findAcrossLines(lines, /vitamin(?:e)?\s*c\b/i, milligrams),
    vitaminD: findAcrossLines(lines, /vitamin(?:e)?\s*d\b/i, micrograms),
  };

  return {
    foodId: `custom-${Date.now()}`,
    name: productName(lines),
    servings: [serving],
  };
}
