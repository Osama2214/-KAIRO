export interface EgyptGovernorate {
  value: string;
  label: string;
  badge?: string;
  defaultRate: number;
}

export const EGYPT_GOVERNORATES: EgyptGovernorate[] = [
  { value: "Cairo", label: "Cairo", defaultRate: 50 },
  { value: "Giza / 6th of October", label: "Giza / 6th of October", badge: "HQ HUB", defaultRate: 50 },
  { value: "Alexandria", label: "Alexandria", defaultRate: 65 },
  { value: "Qalyubia", label: "Qalyubia", defaultRate: 60 },
  { value: "Sharqia", label: "Sharqia", defaultRate: 65 },
  { value: "Dakahlia / Mansoura", label: "Dakahlia / Mansoura", defaultRate: 65 },
  { value: "Gharbia / Tanta", label: "Gharbia / Tanta", defaultRate: 65 },
  { value: "Monufia", label: "Monufia", defaultRate: 65 },
  { value: "Beheira", label: "Beheira", defaultRate: 65 },
  { value: "Ismailia / Suez / Port Said", label: "Ismailia / Suez / Port Said", defaultRate: 70 },
  { value: "Red Sea / Hurghada", label: "Red Sea / Hurghada", defaultRate: 90 },
  { value: "Upper Egypt Governorates", label: "Upper Egypt Governorates", defaultRate: 85 },
  { value: "All Other Governorates", label: "All Other Governorates", defaultRate: 75 },
];

export const DEFAULT_GOVERNORATE_RATES: Record<string, number> = EGYPT_GOVERNORATES.reduce(
  (acc, gov) => {
    acc[gov.value] = gov.defaultRate;
    return acc;
  },
  {} as Record<string, number>
);
