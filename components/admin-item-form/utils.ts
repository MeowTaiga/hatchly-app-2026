/**
 * Utility functions for the admin item form.
 */

import {
  STYLE_FRAGMENT,
  STYLE_FRAGMENT_FISH,
  STYLE_FRAGMENT_CHAIRS,
  STYLE_FRAGMENT_FLOORING,
  STYLE_FRAGMENT_FLOORING_BORDER,
  STYLE_FRAGMENT_STRIP_H,
  STYLE_FRAGMENT_STRIP_V,
  STYLE_FRAGMENT_STRIP_END,
  STYLE_FRAGMENT_GROUND_OVERLAY,
} from './constants';

export function buildDefaultPrompt(itemLabel: string, category?: string, subCategory?: string): string {
  const name = itemLabel.trim() || 'item';
  if (subCategory === 'ground_overlay') {
    return (
      `Irregular transparent overlay stamp of ${name} that blends into the ground underneath ` +
      `in a cozy top-down farming game. ` +
      STYLE_FRAGMENT_GROUND_OVERLAY
    );
  }
  if (category === 'tiled_flooring') {
    if (subCategory === 'floor_border') {
      return (
        `Seamless rotatable edge-border floor tile for ${name} in a cozy top-down farming game. ` +
        STYLE_FRAGMENT_FLOORING_BORDER
      );
    }
    if (subCategory === 'strip_h') {
      return (
        `Horizontally tileable transparent strip of ${name} for a cozy top-down farming game ` +
        `(repeat side-by-side for any length). ` +
        STYLE_FRAGMENT_STRIP_H
      );
    }
    if (subCategory === 'strip_v') {
      return (
        `Vertically tileable transparent strip of ${name} for a cozy top-down farming game ` +
        `(stack north–south for any length). ` +
        STYLE_FRAGMENT_STRIP_V
      );
    }
    if (subCategory === 'strip_end') {
      return (
        `End-cap / terminus piece for ${name} that matches an attached repeating-strip reference ` +
        `in a cozy top-down farming game. ` +
        STYLE_FRAGMENT_STRIP_END
      );
    }
    return (
      `Seamless tileable floor texture of ${name} for a cozy top-down farming game. ` +
      STYLE_FRAGMENT_FLOORING
    );
  }
  let style = STYLE_FRAGMENT;
  if (category === 'fish') style = STYLE_FRAGMENT_FISH;
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
