import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TILE_SIZE } from '../../constants';
import { getMoodFromStats } from './moodUtils';

/**
 * Emoji shown based on hunger/happy/mood. Replace with pet.bubble[slot] URLs later.
 */
const BUBBLE_EMOJI: Record<string, string> = {
  hungry: '🍽️',
  sad: '😢',
  sour: '😤',
  happy: '😊',
  sleepy: 'Zzz',
  default: '💭',
};

export type BubbleMood = keyof typeof BUBBLE_EMOJI;

const PET_MOOD_TO_BUBBLE: Record<import('./moodUtils').PetMood, BubbleMood> = {
  sour: 'sour',
  sad: 'sad',
  hungry: 'hungry',
  happy: 'happy',
  neutral: 'default',
};

/**
 * Derives bubble mood from pet stats. Delegates to shared moodUtils.
 */
export function getBubbleMood(
  hunger: number,
  happy: number,
  mood: number,
): BubbleMood {
  return PET_MOOD_TO_BUBBLE[getMoodFromStats(hunger, happy, mood)];
}

interface PetBubbleProps {
  mood: BubbleMood;
  imageUrl?: string | null;
}

/**
 * Cloud-like bubble above the pet. Emoji for now; imageUrl for future AI assets.
 */
export const PetBubble = React.memo(function PetBubble({ mood, imageUrl }: PetBubbleProps) {
  const emoji = BUBBLE_EMOJI[mood] ?? BUBBLE_EMOJI.default;

  return (
    <View style={styles.bubble} pointerEvents="none">
      {imageUrl ? (
        <Text style={styles.placeholder}>🖼️</Text>
      ) : (
        <Text style={styles.emoji}>{emoji}</Text>
      )}
    </View>
  );
});

const BUBBLE_SIZE = TILE_SIZE * 0.9;

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    bottom: '100%',
    alignSelf: 'center',
    marginBottom: 4,
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 2,
    borderColor: 'rgba(200,220,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
  },
  emoji: {
    fontSize: BUBBLE_SIZE * 0.5,
  },
  placeholder: {
    fontSize: BUBBLE_SIZE * 0.4,
  },
});
