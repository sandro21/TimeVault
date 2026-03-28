"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

const IS_PRO_KEY = "isPro";
const BILLING_RATES_KEY = "billingRates";

interface ProContextType {
  isPro: boolean;
  billingRates: Record<string, number>;
  activatePro: () => void;
  deactivatePro: () => void;
  setBillingRate: (activityName: string, rate: number) => void;
  setBillingRatesBatch: (rates: Record<string, number>) => void;
}

const ProContext = createContext<ProContextType | undefined>(undefined);

function loadBool(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === "true";
  } catch {
    return fallback;
  }
}

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function ProProvider({ children }: { children: ReactNode }) {
  const [isPro, setIsPro] = useState(() => loadBool(IS_PRO_KEY, false));
  const [billingRates, setBillingRates] = useState<Record<string, number>>(
    () => loadJson(BILLING_RATES_KEY, {})
  );

  useEffect(() => {
    localStorage.setItem(IS_PRO_KEY, String(isPro));
  }, [isPro]);

  useEffect(() => {
    localStorage.setItem(BILLING_RATES_KEY, JSON.stringify(billingRates));
  }, [billingRates]);

  const activatePro = useCallback(() => setIsPro(true), []);
  const deactivatePro = useCallback(() => setIsPro(false), []);

  const setBillingRate = useCallback(
    (activityName: string, rate: number) =>
      setBillingRates((prev) => ({ ...prev, [activityName]: rate })),
    []
  );

  const setBillingRatesBatch = useCallback(
    (rates: Record<string, number>) => setBillingRates(rates),
    []
  );

  return (
    <ProContext.Provider
      value={{
        isPro,
        billingRates,
        activatePro,
        deactivatePro,
        setBillingRate,
        setBillingRatesBatch,
      }}
    >
      {children}
    </ProContext.Provider>
  );
}

export function usePro() {
  const ctx = useContext(ProContext);
  if (!ctx) throw new Error("usePro must be used within a ProProvider");
  return ctx;
}
