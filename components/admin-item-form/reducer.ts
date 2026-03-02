/**
 * Reducer for the admin item form state.
 */

import type { AdminGameItem, AdminGameItemHarvestDrop } from '@/lib/api';
import type { FormState } from './types';
import type { ActionType } from './constants';

// ─── Initial state ─────────────────────────────────────────────────────────

export const INITIAL_STATE: FormState = {
  label: '',
  imageUrl: '',
  category: 'decoration',
  itemType: '',
  subCategory: '',
  placeable: true,
  cols: '2',
  rows: '2',
  autoConnect: false,
  centerOverflow: false,
  directionalImages: {},
  buyable: false,
  gemPrice: '',
  sellable: true,
  sellPrice: '',
  farmLevel: '',
  petLevel: '',
  shopSection: '',
  availableUntil: '',
  growthMs: '',
  harvestYield: [],
  gemsGiven: '',
  bugSizeMin: '',
  bugSizeMax: '',
  bugRarity: 'common',
  bugActiveTime: 'all_day',
  bugSpawnOn: [],
  bugScenes: [],
  fishSizeMin: '',
  fishSizeMax: '',
  fishRarity: 'common',
  fishActiveTime: 'all_day',
  fishSpotTypes: [],
  lightEnabled: false,
  lightRadius: '3',
  lightColor: '#FFDD88',
  lightIntensity: '0.5',
  foodHunger: '',
  foodHappiness: '',
  foodPetXp: '',
  foodBuffType: '',
  foodBuffDurationMs: '',
  actionType: 'none',
  actionPayload: '',
  npcDialog: [],
  imagePrompt: '',
  promptTouched: false,
  referenceItemType: '',
  colorSchemeItemType: '',
  extractedColors: [],
  selectedColorIndices: [],
  growsOnTrees: [],
};

// ─── Action types ────────────────────────────────────────────────────────────

export type FormAction =
  | { type: 'POPULATE'; payload: AdminGameItem }
  | { type: 'SET_FIELD'; field: keyof FormState; value: string | boolean | string[] | number[] }
  | { type: 'SET_EXTRACTED_COLORS'; itemType: string; colors: string[] }
  | { type: 'TOGGLE_COLOR_INDEX'; index: number }
  | { type: 'RESET_PROMPT' }
  | { type: 'ADD_HARVEST_DROP'; currentSlug: string }
  | { type: 'REMOVE_HARVEST_DROP'; index: number }
  | { type: 'UPDATE_HARVEST_DROP'; index: number; field: keyof AdminGameItemHarvestDrop; value: string }
  | { type: 'SET_DIRECTIONAL_IMAGES'; payload: Record<string, string> }
  | { type: 'SET_IMAGE_URL'; payload: string }
  | { type: 'SET_NPC_DIALOG'; payload: { text: string }[] }
  | { type: 'SET_NPC_DIALOG_STEP'; index: number; text: string }
  | { type: 'ADD_NPC_DIALOG_STEP' }
  | { type: 'REMOVE_NPC_DIALOG_STEP'; index: number }
  | { type: 'MOVE_NPC_DIALOG_STEP'; from: number; to: number };

// ─── Reducer ─────────────────────────────────────────────────────────────────

function toStr(v: number | undefined | null): string {
  return v != null ? String(v) : '';
}

export function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'POPULATE': {
      const item = action.payload;
      return {
        ...state,
        itemType: item.itemType,
        label: item.label,
        imageUrl: item.imageUrl ?? '',
        category: item.category,
        placeable: item.placeable,
        cols: String(item.cols),
        rows: String(item.rows),
        growthMs: toStr(item.growthMs),
        harvestYield: item.harvestYield ?? [],
        gemsGiven: toStr(item.gemsGiven),
        bugSizeMin: toStr(item.bugSizeMin),
        bugSizeMax: toStr(item.bugSizeMax),
        bugRarity: item.bugRarity ?? 'common',
        bugActiveTime: item.bugActiveTime ?? 'all_day',
        bugSpawnOn: item.bugSpawnOn ?? [],
        bugScenes: item.bugScenes ?? [],
        fishSizeMin: toStr(item.fishSizeMin),
        fishSizeMax: toStr(item.fishSizeMax),
        fishRarity: item.fishRarity ?? 'common',
        fishActiveTime: item.fishActiveTime ?? 'all_day',
        fishSpotTypes: item.fishSpotTypes ?? [],
        lightEnabled: (item.lightRadius ?? 0) > 0,
        lightRadius: toStr(item.lightRadius) || '3',
        lightColor: item.lightColor ?? '#FFDD88',
        lightIntensity: toStr(item.lightIntensity) || '0.5',
        actionType: (item.interactAction?.type as ActionType) ?? 'none',
        actionPayload: item.interactAction?.payload ?? '',
        autoConnect: item.autoConnect ?? false,
        centerOverflow: item.centerOverflow ?? false,
        directionalImages: (item.directionalImages ?? {}) as Record<string, string>,
        buyable: item.buyable ?? false,
        gemPrice: item.gemPrice ? String(item.gemPrice) : '',
        sellable: item.sellable ?? true,
        sellPrice: item.sellPrice != null ? String(item.sellPrice) : '',
        farmLevel: toStr(item.farmLevel),
        petLevel: toStr(item.petLevel),
        shopSection: item.shopSection ?? '',
        availableUntil: item.availableUntil ? item.availableUntil.slice(0, 16) : '',
        subCategory: item.subCategory ?? '',
        foodHunger: item.category === 'food' ? (toStr(item.foodHunger) || '20') : toStr(item.foodHunger),
        foodHappiness: item.category === 'food' ? (toStr(item.foodHappiness) || '10') : toStr(item.foodHappiness),
        foodPetXp: item.category === 'food' ? (toStr(item.foodPetXp) || '10') : toStr(item.foodPetXp),
        foodBuffType: item.foodBuffType ?? '',
        foodBuffDurationMs: toStr(item.foodBuffDurationMs),
        npcDialog: (item.npcDialog ?? []).map((s) => ({ text: s.text })),
        colorSchemeItemType: '',
        extractedColors: [],
        selectedColorIndices: [],
        growsOnTrees: item.subCategory === 'fruit' ? (item.growsOnTrees ?? []) : [],
      };
    }

    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };

    case 'SET_EXTRACTED_COLORS':
      return {
        ...state,
        colorSchemeItemType: action.itemType,
        extractedColors: action.colors,
        selectedColorIndices: action.colors.map((_, i) => i),
      };

    case 'TOGGLE_COLOR_INDEX': {
      const idx = action.index;
      const selected = new Set(state.selectedColorIndices);
      if (selected.has(idx)) selected.delete(idx);
      else selected.add(idx);
      return { ...state, selectedColorIndices: Array.from(selected).sort((a, b) => a - b) };
    }

    case 'RESET_PROMPT':
      return { ...state, promptTouched: false, imagePrompt: '' };

    case 'ADD_HARVEST_DROP':
      return {
        ...state,
        harvestYield: [...state.harvestYield, { itemType: action.currentSlug, qty: 1 }],
      };

    case 'REMOVE_HARVEST_DROP':
      return {
        ...state,
        harvestYield: state.harvestYield.filter((_, i) => i !== action.index),
      };

    case 'UPDATE_HARVEST_DROP': {
      const { index, field, value } = action;
      return {
        ...state,
        harvestYield: state.harvestYield.map((d, i) => {
          if (i !== index) return d;
          if (field === 'qty') return { ...d, qty: value === '' ? 0 : (parseInt(value, 10) ?? 0) };
          return { ...d, [field]: value };
        }),
      };
    }

    case 'SET_DIRECTIONAL_IMAGES':
      return { ...state, directionalImages: action.payload };

    case 'SET_IMAGE_URL':
      return { ...state, imageUrl: action.payload };

    case 'SET_NPC_DIALOG':
      return { ...state, npcDialog: action.payload };

    case 'SET_NPC_DIALOG_STEP': {
      const arr = [...state.npcDialog];
      if (action.index >= 0 && action.index < arr.length) {
        arr[action.index] = { text: action.text };
        return { ...state, npcDialog: arr };
      }
      return state;
    }

    case 'ADD_NPC_DIALOG_STEP':
      return { ...state, npcDialog: [...state.npcDialog, { text: '' }] };

    case 'REMOVE_NPC_DIALOG_STEP':
      return {
        ...state,
        npcDialog: state.npcDialog.filter((_, i) => i !== action.index),
      };

    case 'MOVE_NPC_DIALOG_STEP': {
      const { from, to } = action;
      const arr = [...state.npcDialog];
      if (from < 0 || from >= arr.length || to < 0 || to >= arr.length) return state;
      const [removed] = arr.splice(from, 1);
      arr.splice(to, 0, removed);
      return { ...state, npcDialog: arr };
    }

    default:
      return state;
  }
}
