export interface EgyptGovernorate {
  value: string;
  label: string;
  labelAr?: string;
  badge?: string;
  badgeAr?: string;
  defaultRate: number;
}

export const EGYPT_GOVERNORATES: EgyptGovernorate[] = [
  { value: "Cairo", label: "Cairo", labelAr: "القاهرة", defaultRate: 50 },
  { value: "Giza / 6th of October", label: "Giza / 6th of October", labelAr: "الجيزة / 6 أكتوبر", badge: "HQ HUB", badgeAr: "مركز الشحن", defaultRate: 50 },
  { value: "Alexandria", label: "Alexandria", labelAr: "الإسكندرية", defaultRate: 65 },
  { value: "Qalyubia", label: "Qalyubia", labelAr: "القليوبية", defaultRate: 60 },
  { value: "Sharqia", label: "Sharqia", labelAr: "الشرقية", defaultRate: 65 },
  { value: "Dakahlia / Mansoura", label: "Dakahlia / Mansoura", labelAr: "الدقهلية / المنصورة", defaultRate: 65 },
  { value: "Gharbia / Tanta", label: "Gharbia / Tanta", labelAr: "الغربية / طنطا", defaultRate: 65 },
  { value: "Monufia", label: "Monufia", labelAr: "المنوفية", defaultRate: 65 },
  { value: "Beheira", label: "Beheira", labelAr: "البحيرة", defaultRate: 65 },
  { value: "Ismailia / Suez / Port Said", label: "Ismailia / Suez / Port Said", labelAr: "الإسماعيلية / السويس / بورسعيد", defaultRate: 70 },
  { value: "Red Sea / Hurghada", label: "Red Sea / Hurghada", labelAr: "البحر الأحمر / الغردقة", defaultRate: 90 },
  { value: "Upper Egypt Governorates", label: "Upper Egypt Governorates", labelAr: "محافظات الصعيد (أسيوط، سوهاج، قنا، الأقصر، أسوان)", defaultRate: 85 },
  { value: "All Other Governorates", label: "All Other Governorates", labelAr: "باقي المحافظات والمناطق الحدودية", defaultRate: 75 },
];

export const DEFAULT_GOVERNORATE_RATES: Record<string, number> = EGYPT_GOVERNORATES.reduce(
  (acc, gov) => {
    acc[gov.value] = gov.defaultRate;
    return acc;
  },
  {} as Record<string, number>
);
