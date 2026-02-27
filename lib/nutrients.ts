/**
 * Single source of truth for nutrient definitions.
 * Used by index chips, MacroInfoDrawer, MacroGoalsProvider, and API.
 */

export const NUTRIENT_KEYS = [
  'protein',
  'fat',
  'saturatedFat',
  'transFat',
  'carbs',
  'sugar',
  'addedSugars',
  'fiber',
  'sodium',
  'potassium',
  'cholesterol',
  'iron',
  'calcium',
  'vitaminA',
  'vitaminC',
  'vitaminD',
] as const;

export type NutrientKey = (typeof NUTRIENT_KEYS)[number];

export interface NutrientConfig {
  key: NutrientKey;
  label: string;
  shortLabel: string;
  unit: 'g' | 'mg' | 'mcg';
  color: string;
  what: string;
  why: string;
}

export const NUTRIENT_CONFIG: Record<NutrientKey, NutrientConfig> = {
  protein: {
    key: 'protein',
    label: 'Protein',
    shortLabel: 'P',
    unit: 'g',
    color: '#67E8F9',
    what: 'Protein is made of amino acids—the building blocks for muscles, enzymes, hormones, and tissues. Found in meat, fish, eggs, dairy, legumes, and nuts.',
    why: 'Helps build and repair muscle, keeps you full longer, and supports immunity. Aim for ~25% of daily calories from protein.',
  },
  fat: {
    key: 'fat',
    label: 'Total Fat',
    shortLabel: 'F',
    unit: 'g',
    color: '#F59E0B',
    what: 'Fat provides energy, helps absorb vitamins (A, D, E, K), and supports cell function. Comes from oils, butter, nuts, avocado, and animal products.',
    why: 'Essential for hormones and brain health. Keep total fat around 25–35% of calories; focus on quality over quantity.',
  },
  saturatedFat: {
    key: 'saturatedFat',
    label: 'Saturated Fat',
    shortLabel: 'Sat',
    unit: 'g',
    color: '#D97706',
    what: 'A type of fat that stays solid at room temperature. Found in red meat, butter, cheese, cream, and coconut oil.',
    why: 'Limit to <10% of calories. Too much may raise LDL cholesterol and heart disease risk. Choose unsaturated fats when possible.',
  },
  transFat: {
    key: 'transFat',
    label: 'Trans Fat',
    shortLabel: 'Trans',
    unit: 'g',
    color: '#B45309',
    what: 'Artificially created fat from hydrogenation (used in fried foods, baked goods, margarine). Also occurs naturally in small amounts in dairy and meat.',
    why: 'Avoid as much as possible. Trans fats raise bad cholesterol, lower good cholesterol, and increase heart disease risk.',
  },
  carbs: {
    key: 'carbs',
    label: 'Carbohydrates',
    shortLabel: 'C',
    unit: 'g',
    color: '#C084FC',
    what: "Your body's main energy source. Includes sugars, starches, and fiber—found in grains, fruits, vegetables, and legumes.",
    why: 'Carbs fuel your brain and muscles. Aim for ~45–65% of calories, preferring whole grains and fiber-rich sources over refined sugars.',
  },
  sugar: {
    key: 'sugar',
    label: 'Sugar',
    shortLabel: 'S',
    unit: 'g',
    color: '#A78BFA',
    what: 'Simple carbs that taste sweet. Includes naturally occurring (fruit, milk) and added sugars (syrup, honey, table sugar).',
    why: 'Limit added sugars—AHA recommends max 36g men, 25g women. Too much spikes blood sugar and can lead to weight gain and metabolic issues.',
  },
  addedSugars: {
    key: 'addedSugars',
    label: 'Added Sugars',
    shortLabel: 'Add S',
    unit: 'g',
    color: '#8B5CF6',
    what: 'Sugars added during processing or cooking (not naturally in the food). Found in soda, candy, cookies, and many packaged foods.',
    why: 'Target <50g/day. Added sugars provide calories without nutrients and are linked to obesity, diabetes, and heart disease.',
  },
  fiber: {
    key: 'fiber',
    label: 'Fiber',
    shortLabel: 'Fi',
    unit: 'g',
    color: '#34D399',
    what: 'Indigestible plant matter. Soluble (oats, apples) and insoluble (whole grains, veggies) both support digestion and gut health.',
    why: 'Aim for 25–30g daily. Fiber helps with regularity, blood sugar control, cholesterol, and feeling full. Most people don\'t get enough.',
  },
  sodium: {
    key: 'sodium',
    label: 'Sodium',
    shortLabel: 'Na',
    unit: 'mg',
    color: '#60A5FA',
    what: 'A mineral (table salt is sodium chloride) that helps balance fluids and supports nerves and muscles.',
    why: 'Limit to 2,300mg/day (or 1,500mg if at risk). Excess sodium raises blood pressure and stroke risk.',
  },
  potassium: {
    key: 'potassium',
    label: 'Potassium',
    shortLabel: 'K',
    unit: 'mg',
    color: '#38BDF8',
    what: 'A mineral and electrolyte that supports heart rhythm, muscle function, and blood pressure regulation. Found in bananas, potatoes, beans, and leafy greens.',
    why: 'Aim for 4,700mg daily. Helps counteract sodium\'s effect on blood pressure. Most people don\'t meet the recommendation.',
  },
  cholesterol: {
    key: 'cholesterol',
    label: 'Cholesterol',
    shortLabel: 'Chol',
    unit: 'mg',
    color: '#F472B6',
    what: 'A waxy substance in animal products (egg yolks, meat, dairy). Your body also makes cholesterol. Dietary cholesterol has less impact than saturated/trans fat.',
    why: 'Guidelines suggest <300mg/day from food. Focus more on limiting saturated and trans fats, which raise blood cholesterol more than dietary cholesterol.',
  },
  iron: {
    key: 'iron',
    label: 'Iron',
    shortLabel: 'Fe',
    unit: 'mg',
    color: '#78716c',
    what: 'A mineral essential for hemoglobin—the protein in red blood cells that carries oxygen. Found in meat, beans, spinach, fortified cereals, and lentils.',
    why: 'Adults need ~8–18mg daily. Iron deficiency can cause fatigue and anemia. Vitamin C helps iron absorption.',
  },
  calcium: {
    key: 'calcium',
    label: 'Calcium',
    shortLabel: 'Ca',
    unit: 'mg',
    color: '#94a3b8',
    what: 'A mineral vital for strong bones and teeth, blood clotting, and muscle function. Found in dairy, leafy greens, tofu, and fortified foods.',
    why: 'Aim for 1,000–1,300mg daily. Adequate calcium plus vitamin D supports bone health and may reduce osteoporosis risk.',
  },
  vitaminA: {
    key: 'vitaminA',
    label: 'Vitamin A',
    shortLabel: 'Vit A',
    unit: 'mcg',
    color: '#f97316',
    what: 'A fat-soluble vitamin important for vision, immune function, and skin health. Found in carrots, sweet potatoes, leafy greens, and liver.',
    why: 'Adults need ~700–900mcg daily. Supports eye health and immunity. Avoid excess from supplements.',
  },
  vitaminC: {
    key: 'vitaminC',
    label: 'Vitamin C',
    shortLabel: 'Vit C',
    unit: 'mg',
    color: '#22c55e',
    what: 'A water-soluble vitamin and antioxidant. Supports immunity, collagen production, and iron absorption. Found in citrus, berries, peppers, and broccoli.',
    why: 'Aim for 75–90mg daily. Helps heal wounds and may reduce cold duration. Most people get enough from food.',
  },
  vitaminD: {
    key: 'vitaminD',
    label: 'Vitamin D',
    shortLabel: 'Vit D',
    unit: 'mcg',
    color: '#eab308',
    what: 'A fat-soluble vitamin that helps absorb calcium and supports bone and immune health. Found in fatty fish, egg yolks, and fortified milk.',
    why: 'Adults need ~15–20mcg (600–800 IU) daily. Many are deficient. Sun exposure helps but varies by location and skin tone.',
  },
};

export interface MacroGoals {
  protein: number;
  fat: number;
  saturatedFat: number;
  transFat: number;
  carbs: number;
  sugar: number;
  addedSugars: number;
  fiber: number;
  sodium: number;
  potassium: number;
  cholesterol: number;
  iron: number;
  calcium: number;
  vitaminA: number;
  vitaminC: number;
  vitaminD: number;
}

/** Today's consumed totals (from FoodProvider) */
export interface MacroTotals {
  protein: number;
  fat: number;
  saturatedFat: number;
  transFat: number;
  carbs: number;
  sugar: number;
  addedSugars: number;
  fiber: number;
  sodium: number;
  potassium: number;
  cholesterol: number;
  iron: number;
  calcium: number;
  vitaminA: number;
  vitaminC: number;
  vitaminD: number;
}

/** Default daily goals from calorie target + FDA/AHA guidelines */
export function getDefaultGoals(calorieTarget: number): MacroGoals {
  return {
    protein: Math.round((calorieTarget * 0.25) / 4),
    fat: Math.round((calorieTarget * 0.25) / 9),
    saturatedFat: Math.round((calorieTarget * 0.1) / 9),
    transFat: 0,
    carbs: Math.round((calorieTarget * 0.5) / 4),
    sugar: 50,
    addedSugars: 50,
    fiber: 30,
    sodium: 2300,
    potassium: 4700,
    cholesterol: 300,
    iron: 11,
    calcium: 1000,
    vitaminA: 900,
    vitaminC: 90,
    vitaminD: 20,
  };
}

/** Merge user overrides with defaults (undefined/null → use default) */
export function mergeGoals(
  defaults: MacroGoals,
  overrides: Partial<MacroGoals> | null | undefined
): MacroGoals {
  if (!overrides) return { ...defaults };
  const out = { ...defaults };
  for (const k of NUTRIENT_KEYS) {
    const v = overrides[k as keyof MacroGoals];
    if (typeof v === 'number' && v >= 0) out[k] = v;
  }
  return out;
}
