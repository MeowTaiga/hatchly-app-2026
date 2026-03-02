/**
 * Weight and BMI utilities for goal weight suggestions.
 * Uses CDC healthy BMI range: 18.5–24.9.
 */

const BMI_MIN = 18.5;
const BMI_MAX = 24.9;
const LBS_PER_BMI_UNIT = 703;

/**
 * Convert height to total inches.
 */
export function heightToInches(feet: number, inches: number): number {
  return feet * 12 + inches;
}

/**
 * Get healthy weight range (lbs) for a given height based on BMI 18.5–24.9.
 */
export function getHealthyWeightRange(
  heightFeet: number,
  heightInches: number,
): { min: number; max: number; mid: number } {
  const heightIn = heightToInches(heightFeet, heightInches);
  if (heightIn <= 0) return { min: 100, max: 200, mid: 150 };
  const heightSq = heightIn * heightIn;
  const min = (BMI_MIN * heightSq) / LBS_PER_BMI_UNIT;
  const max = (BMI_MAX * heightSq) / LBS_PER_BMI_UNIT;
  const mid = (min + max) / 2;
  return { min: Math.round(min), max: Math.round(max), mid: Math.round(mid) };
}

/**
 * Suggest a goal weight based on current weight and height.
 * Returns the nearest healthy weight (clamped to BMI 18.5–24.9 range).
 * If current weight is already in range, returns current weight (maintain).
 */
export function getSuggestedGoalWeight(
  currentWeight: number,
  heightFeet: number,
  heightInches: number,
): number {
  const { min, max } = getHealthyWeightRange(heightFeet, heightInches);
  const clamped = Math.max(min, Math.min(max, Math.round(currentWeight)));
  return clamped;
}

/**
 * Calculate BMI from weight (lbs) and height (inches).
 * Formula: (weight_lbs * 703) / (height_inches²)
 */
export function calculateBMI(weightLbs: number, heightInches: number): number | null {
  if (heightInches <= 0) return null;
  return (weightLbs * LBS_PER_BMI_UNIT) / (heightInches * heightInches);
}

/** BMI category for display (CDC standard ranges). */
export type BMICategory = 'Underweight' | 'Normal' | 'Overweight' | 'Obese';

export function getBMICategory(bmi: number): BMICategory {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}
