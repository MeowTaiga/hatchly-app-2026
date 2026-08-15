import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import type { CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import type { FoodDetail } from '@/lib/api';
import { parseNutritionFacts } from '@/components/food/parseNutritionFacts';

const FIRST_SHOT_MS = 700;
const INTERVAL_MS = 900;

type RecognizeFn = (uri: string) => Promise<{
  text: string;
  blocks?: Array<{ text: string; lines?: Array<{ text: string }> }>;
}>;

async function loadOcr(): Promise<{ recognizeText: RecognizeFn; isSupported: () => boolean } | null> {
  if (Platform.OS === 'web') return null;
  try {
    const mod = await import('expo-mlkit-ocr');
    return {
      recognizeText: mod.recognizeText,
      isSupported: () => {
        try {
          return mod.isSupported();
        } catch {
          return true;
        }
      },
    };
  } catch {
    return null;
  }
}

function linesFromOcr(result: Awaited<ReturnType<RecognizeFn>>): string[] {
  const fromBlocks = result.blocks?.flatMap((block) =>
    block.lines?.length ? block.lines.map((line) => line.text) : [block.text],
  ) ?? [];
  if (fromBlocks.length) return fromBlocks;
  return result.text.split(/\n+/);
}

export function useLabelScan(
  cameraRef: React.RefObject<CameraView | null>,
  enabled: boolean,
  onFound: (food: FoodDetail) => void,
) {
  const [reading, setReading] = useState(false);
  const busyRef = useRef(false);
  const stopRef = useRef(false);
  const onFoundRef = useRef(onFound);
  onFoundRef.current = onFound;

  const stop = useCallback(() => {
    stopRef.current = true;
  }, []);

  useEffect(() => {
    if (!enabled) {
      stopRef.current = true;
      busyRef.current = false;
      setReading(false);
      return;
    }

    stopRef.current = false;
    let interval: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    const run = async () => {
      const ocr = await loadOcr();
      if (cancelled || stopRef.current || !ocr?.isSupported()) return;

      const poll = async () => {
        if (stopRef.current || busyRef.current) return;
        const cam = cameraRef.current;
        if (!cam) return;
        busyRef.current = true;
        setReading(true);
        try {
          const photo = await cam.takePictureAsync({
            quality: 0.6,
            shutterSound: false,
          });
          if (stopRef.current || !photo?.uri) return;
          const result = await ocr.recognizeText(photo.uri);
          if (stopRef.current) return;
          const food = parseNutritionFacts(result.text, linesFromOcr(result));
          if (food) {
            stopRef.current = true;
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onFoundRef.current(food);
          }
        } catch {
          // Blurry frames and non-labels are expected.
        } finally {
          busyRef.current = false;
          setReading(false);
        }
      };

      void poll();
      interval = setInterval(() => { void poll(); }, INTERVAL_MS);
    };

    const start = setTimeout(() => { void run(); }, FIRST_SHOT_MS);

    return () => {
      cancelled = true;
      stopRef.current = true;
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
  }, [cameraRef, enabled]);

  return { reading, stop };
}
