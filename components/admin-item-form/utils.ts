/**
 * Utility functions for the admin item form.
 */

import { STYLE_FRAGMENT, STYLE_FRAGMENT_FISH, STYLE_FRAGMENT_CHAIRS, STYLE_FRAGMENT_FLOORING } from './constants';

export function buildDefaultPrompt(itemLabel: string, category?: string, subCategory?: string): string {
  const name = itemLabel.trim() || 'item';
  let style = STYLE_FRAGMENT;
  if (category === 'tiled_flooring') style = STYLE_FRAGMENT_FLOORING;
  else if (category === 'fish') style = STYLE_FRAGMENT_FISH;
  else if (subCategory === 'chairs') style = STYLE_FRAGMENT_CHAIRS;
  return `A single ${name}, 2D game sprite for a cozy top-down farming game. ${style}`;
}

export function nameToSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'item';
}
