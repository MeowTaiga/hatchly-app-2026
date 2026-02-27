/**
 * Renders dialog text with placeholder replacement:
 * - {playername} -> player name (farm name)
 * - {item_slug} or {stone_pickaxe} -> inline item image
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CachedImage } from '@/components/ui/CachedImage';
import type { ItemDefinition } from './types';

/** Matches {playername} or {item_slug} patterns. */
const PLACEHOLDER_REGEX = /\{(playername|[a-z0-9_]+)\}/gi;

interface DialogTextProps {
  text: string;
  playerName: string;
  itemDefs?: Record<string, ItemDefinition>;
  /** When {item} is used, show this item (e.g. first reward item). */
  defaultItemType?: string;
  textStyle?: object;
  inlineImageSize?: number;
}

export function DialogText({
  text,
  playerName,
  itemDefs = {},
  defaultItemType,
  textStyle,
  inlineImageSize = 28,
}: DialogTextProps) {
  const parts: Array<{ type: 'text' | 'playername' | 'item'; value: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const re = new RegExp(PLACEHOLDER_REGEX.source, 'gi');
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    const key = match[1].toLowerCase();
    if (key === 'playername') {
      parts.push({ type: 'playername', value: playerName });
    } else if (key === 'item' && defaultItemType && itemDefs[defaultItemType]) {
      parts.push({ type: 'item', value: defaultItemType });
    } else if (itemDefs[key]) {
      parts.push({ type: 'item', value: key });
    } else {
      parts.push({ type: 'text', value: match[0] });
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  if (parts.length === 0) return <Text style={textStyle}>{text}</Text>;
  if (parts.length === 1 && parts[0].type === 'text') {
    return <Text style={textStyle}>{parts[0].value}</Text>;
  }

  return (
    <View style={styles.container}>
      {parts.map((part, i) => {
        if (part.type === 'text') {
          return <Text key={i} style={[styles.text, textStyle]}>{part.value}</Text>;
        }
        if (part.type === 'playername') {
          return <Text key={i} style={[styles.text, textStyle]}>{part.value}</Text>;
        }
        if (part.type === 'item') {
          const def = itemDefs[part.value];
          return (
            <View key={i} style={[styles.inlineItem, { width: inlineImageSize, height: inlineImageSize }]}>
              {def?.imageUrl ? (
                <CachedImage
                  source={{ uri: def.imageUrl }}
                  style={[styles.inlineImage, { width: inlineImageSize, height: inlineImageSize }]}
                  resizeMode="contain"
                />
              ) : (
                <View style={[styles.inlineImagePlaceholder, { width: inlineImageSize, height: inlineImageSize }]}>
                  <Text style={styles.inlineEmoji}>{def?.emoji ?? '📦'}</Text>
                </View>
              )}
            </View>
          );
        }
        return null;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    lineHeight: 20,
  },
  inlineItem: {
    alignSelf: 'center',
    marginHorizontal: 2,
  },
  inlineImage: {
    borderRadius: 6,
  },
  inlineImagePlaceholder: {
    backgroundColor: '#e8f4f8',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineEmoji: {
    fontSize: 16,
  },
});
