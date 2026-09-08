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
  { value: "Kafr El Sheikh", label: "Kafr El Sheikh", labelAr: "كفر الشيخ", defaultRate: 65 },
  { value: "Damietta", label: "Damietta", labelAr: "دمياط", defaultRate: 65 },
  { value: "Port Said", label: "Port Said", labelAr: "بورسعيد", defaultRate: 70 },
  { value: "Ismailia", label: "Ismailia", labelAr: "الإسماعيلية", defaultRate: 70 },
  { value: "Suez", label: "Suez", labelAr: "السويس", defaultRate: 70 },
  { value: "Fayoum", label: "Fayoum", labelAr: "الفيوم", defaultRate: 70 },
  { value: "Beni Suef", label: "Beni Suef", labelAr: "بني سويف", defaultRate: 75 },
  { value: "Minya", label: "Minya", labelAr: "المنيا", defaultRate: 80 },
  { value: "Asyut", label: "Asyut", labelAr: "أسيوط", defaultRate: 85 },
  { value: "Sohag", label: "Sohag", labelAr: "سوهاج", defaultRate: 85 },
  { value: "Qena", label: "Qena", labelAr: "قنا", defaultRate: 85 },
  { value: "Luxor", label: "Luxor", labelAr: "الأقصر", defaultRate: 90 },
  { value: "Aswan", label: "Aswan", labelAr: "أسوان", defaultRate: 90 },
  { value: "Red Sea / Hurghada", label: "Red Sea / Hurghada", labelAr: "البحر الأحمر / الغردقة", defaultRate: 90 },
  { value: "Matrouh / North Coast", label: "Matrouh / North Coast", labelAr: "مطروح / الساحل الشمالي", defaultRate: 85 },
  { value: "New Valley", label: "New Valley", labelAr: "الوادي الجديد", defaultRate: 95 },
  { value: "North Sinai", label: "North Sinai", labelAr: "شمال سيناء", defaultRate: 95 },
  { value: "South Sinai / Sharm El Sheikh", label: "South Sinai / Sharm El Sheikh", labelAr: "جنوب سيناء / شرم الشيخ", defaultRate: 95 },
];

export const DEFAULT_GOVERNORATE_RATES: Record<string, number> = EGYPT_GOVERNORATES.reduce(
  (acc, gov) => {
    acc[gov.value] = gov.defaultRate;
    return acc;
  },
  {} as Record<string, number>
);
