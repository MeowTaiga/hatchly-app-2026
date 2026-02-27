/**
 * Health Period Context — provides weekly/monthly toggle state for the health overview.
 * All health cards consume useHealthPeriod() to get the current period.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { HealthPeriod } from '@/lib/healthPeriod';

interface HealthPeriodContextValue {
  period: HealthPeriod;
  setPeriod: (p: HealthPeriod) => void;
}

const HealthPeriodContext = createContext<HealthPeriodContextValue | null>(null);

export function useHealthPeriod(): HealthPeriodContextValue {
  const ctx = useContext(HealthPeriodContext);
  if (!ctx) throw new Error('useHealthPeriod must be used within HealthPeriodProvider');
  return ctx;
}

interface HealthPeriodProviderProps {
  children: React.ReactNode;
}

export function HealthPeriodProvider({ children }: HealthPeriodProviderProps) {
  const [period, setPeriodState] = useState<HealthPeriod>('week');
  const setPeriod = useCallback((p: HealthPeriod) => setPeriodState(p), []);

  return (
    <HealthPeriodContext.Provider value={{ period, setPeriod }}>
      {children}
    </HealthPeriodContext.Provider>
  );
}
