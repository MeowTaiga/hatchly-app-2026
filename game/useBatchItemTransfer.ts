/**
 * Reusable hook for batch item transfer (sell, add to food dish, etc.).
 * Manages inventory snapshot, selected slots, and apply logic.
 */

import { useCallback, useMemo, useState } from 'react';
import type { InventorySlot } from './types';

export type TransferSlot = { itemType: string; qty: number } | null;

export interface UseBatchItemTransferOptions {
  initialSlots: InventorySlot[];
  maxSlots?: number;
}

export interface UseBatchItemTransferReturn {
  inventorySnapshot: InventorySlot[];
  selectedSlots: TransferSlot[];
  availableSlots: InventorySlot[];
  toTransfer: Array<{ itemType: string; qty: number }>;
  selectedByType: Map<string, number>;
  addItem: (itemType: string) => void;
  removeFromSlot: (index: number) => void;
  applyTransfer: (items: Array<{ itemType: string; qty: number }>) => void;
  clearSelection: () => void;
}

function createEmptySlots(maxSlots: number): TransferSlot[] {
  return Array(maxSlots).fill(null);
}

export function useBatchItemTransfer({
  initialSlots,
  maxSlots = 6,
}: UseBatchItemTransferOptions): UseBatchItemTransferReturn {
  const [inventorySnapshot, setInventorySnapshot] = useState<InventorySlot[]>(() =>
    initialSlots.map((s) => ({ ...s })),
  );
  const [selectedSlots, setSelectedSlots] = useState<TransferSlot[]>(() =>
    createEmptySlots(maxSlots),
  );

  const selectedByType = useMemo(() => {
    const map = new Map<string, number>();
    for (const slot of selectedSlots) {
      if (slot) map.set(slot.itemType, (map.get(slot.itemType) ?? 0) + slot.qty);
    }
    return map;
  }, [selectedSlots]);

  const availableSlots = useMemo(() => {
    return inventorySnapshot
      .map((s) => {
        const taken = selectedByType.get(s.itemType) ?? 0;
        const remaining = s.qty - taken;
        return remaining > 0 ? { ...s, qty: remaining } : null;
      })
      .filter((s): s is InventorySlot => s != null);
  }, [inventorySnapshot, selectedByType]);

  const toTransfer = useMemo(
    () => selectedSlots.filter((s): s is { itemType: string; qty: number } => s != null),
    [selectedSlots],
  );

  const addItem = useCallback(
    (itemType: string) => {
      const slot = inventorySnapshot.find((s) => s.itemType === itemType);
      const maxQty = slot?.qty ?? 0;
      const taken = selectedByType.get(itemType) ?? 0;
      if (taken >= maxQty) return;

      setSelectedSlots((prev) => {
        const next = [...prev];
        const existingIdx = next.findIndex((s) => s?.itemType === itemType);
        if (existingIdx >= 0) {
          const s = next[existingIdx]!;
          next[existingIdx] = { ...s, qty: Math.min(s.qty + 1, maxQty) };
        } else {
          const emptyIdx = next.findIndex((s) => s == null);
          if (emptyIdx >= 0) next[emptyIdx] = { itemType, qty: 1 };
        }
        return next;
      });
    },
    [inventorySnapshot, selectedByType],
  );

  const removeFromSlot = useCallback((index: number) => {
    setSelectedSlots((prev) => {
      const slot = prev[index];
      if (!slot) return prev;
      const next = [...prev];
      if (slot.qty <= 1) {
        next[index] = null;
      } else {
        next[index] = { ...slot, qty: slot.qty - 1 };
      }
      return next;
    });
  }, []);

  const applyTransfer = useCallback((items: Array<{ itemType: string; qty: number }>) => {
    setSelectedSlots(createEmptySlots(maxSlots));
    setInventorySnapshot((prev) => {
      const soldMap = new Map(items.map((s) => [s.itemType, s.qty]));
      const next: InventorySlot[] = [];
      for (const s of prev) {
        const sold = soldMap.get(s.itemType) ?? 0;
        const remaining = s.qty - sold;
        if (remaining > 0) next.push({ ...s, qty: remaining });
      }
      return next;
    });
  }, [maxSlots]);

  const clearSelection = useCallback(() => {
    setSelectedSlots(createEmptySlots(maxSlots));
  }, [maxSlots]);

  return {
    inventorySnapshot,
    selectedSlots,
    availableSlots,
    toTransfer,
    selectedByType,
    addItem,
    removeFromSlot,
    applyTransfer,
    clearSelection,
  };
}
