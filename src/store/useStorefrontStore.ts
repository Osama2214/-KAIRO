import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { MangaVolume, Series, GenreInfo, ALL_VOLUMES, ALL_SERIES, GENRES } from "@/data/manga";
import { DEFAULT_GOVERNORATE_RATES, EgyptGovernorate, EGYPT_GOVERNORATES } from "@/data/governorates";
import { withDerivedSeriesVolumes, withoutSeriesVolumes } from "@/lib/seriesVolumes";
import { useCuratorSaveStore } from "@/store/useCuratorSaveStore";
import { STOREFRONT_DATA_KEYS } from "@/lib/storefrontKeys";
import { isMerch, variantRowId, withVariantSummary } from "@/lib/variants";

export interface HeroContent {
  badgeText: string;
  headlineLine1: string;
  headlineHighlight: string;
  headlineLine2: string;
  headline?: string;
  subheadline: string;
  japaneseWatermark1: string;
  japaneseWatermark2: string;
  primaryCtaText: string;
  primaryCtaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
  stat1Value: string;
  stat1Label: string;
  stat2Value: string;
  stat2Label: string;
  stat3Value: string;
  stat3Label: string;
  featuredVolumeId: string;
}

export interface AnnouncementConfig {
  enabled: boolean;
  text: string;
  voucherCode: string;
  discountPercent: number;
}

export interface ShippingConfig {
  hubName: string;
  dispatchBadgeText: string;
  guaranteeBadgeText: string;
  deliveryEstimate: string;
  standardShippingCost: number;
  governorateRates: Record<string, number>;
  governoratesList?: EgyptGovernorate[];
  freeShippingEnabled: boolean;
  freeShippingThreshold: number;
  perk1Title?: string;
  perk1Desc?: string;
  perk2Title?: string;
  perk2Desc?: string;
  perk3Title?: string;
  perk3Desc?: string;
}

export interface EditorialConfig {
  siteTagline: string;
  footerQuote: string;
  contactEmail: string;
  contactPhone: string;
  ownerName: string;
  authenticityGuaranteeText: string;
  shippingPolicyText: string;
  returnPolicyText: string;
  privacyPolicyText?: string;
  footerDescription: string;
  hubCities: string;
}

export interface FeaturedSeriesConfig {
  seriesSlug: string;
  badgeText: string;
  customTitle?: string;
  /** Arabic override; falls back to the English one, then to the series itself. */
  customTitleAr?: string;
  customDescription?: string;
  customDescriptionAr?: string;
  ctaText: string;
  ctaLink?: string;
  customImage?: string;
}

export interface GenreBentoConfig {
  badgeText: string;
  title: string;
  description: string;
}

/** Where the strip may appear. Each slot is a real position in the layout. */
export const TICKER_SLOTS = [
  { id: "after-hero", label: "Home — under the hero" },
  { id: "after-new-releases", label: "Home — under New Releases" },
  { id: "before-discovery", label: "Home — above the search section" },
  { id: "above-footer", label: "Every page — above the footer" },
] as const;

export type TickerSlot = (typeof TICKER_SLOTS)[number]["id"];

export interface TickerConfig {
  enabled: boolean;
  /** Which slots the strip is shown in. Empty means nowhere. */
  placements?: TickerSlot[];
  /** Lines the curator wants marching across the top of every page. */
  messages: string[];
  /** One full pass of the track, in seconds. Lower is faster. */
  speedSeconds: number;
  /** Optional destination for the whole strip. */
  linkHref?: string;
}

export interface TickerArabicConfig {
  messages: string[];
}

export interface BoxSetsConfig {
  badgeText: string;
  headline: string;
  autoplayEnabled: boolean;
  autoplaySpeed: number; // in milliseconds
}

export interface BoxSetsArabicConfig {
  badgeText: string;
  headline: string;
}

/** The home-page section for figures and posters. */
export interface ShopShowcaseConfig {
  enabled: boolean;
  badgeText: string;
  headline: string;
  viewAllText: string;
  /** Curated product ids, shown first; the rest is topped up automatically. */
  productIds: string[];
  maxCards: number;
}

export interface ShopShowcaseArabicConfig {
  badgeText: string;
  headline: string;
  viewAllText: string;
}

export const DEFAULT_SHOP_SHOWCASE_CONFIG: ShopShowcaseConfig = {
  enabled: true,
  badgeText: "FIGURES & POSTERS",
  headline: "THE SHOP",
  viewAllText: "VIEW THE SHOP",
  productIds: [],
  maxCards: 8,
};

export const DEFAULT_SHOP_SHOWCASE_ARABIC_CONFIG: ShopShowcaseArabicConfig = {
  badgeText: "فيجرز وبوسترات",
  headline: "المتجر",
  viewAllText: "تصفح المتجر",
};

export interface TrendingConfig {
  badgeText: string;
  headline: string;
  /**
   * How many cards the rail should carry. Curated picks come first; the rest
   * is topped up by rating only when there are not enough of them.
   */
  minCards?: number;
  autoplayEnabled: boolean;
  autoplaySpeed: number; // in milliseconds
}

export interface NewReleasesConfig {
  badgeText: string;
  headline: string;
  viewAllText: string;
}

export interface MangaDiscoveryConfig {
  badgeText: string;
  title: string;
  description: string;
  searchPlaceholder: string;
  catalogLinkText: string;
  defaultTab: "POPULAR" | "TOP_RATED" | "BEST_SELLERS" | "RECENTLY_ADDED";
  displayCount: number;
}

export interface HeroArabicContent {
  badgeText: string;
  headlineLine1: string;
  headlineHighlight: string;
  headlineLine2: string;
  headline?: string;
  subheadline: string;
  primaryCtaText: string;
  primaryCtaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
  stat1Value: string;
  stat1Label: string;
  stat2Value: string;
  stat2Label: string;
  stat3Value: string;
  stat3Label: string;
}

export interface AnnouncementArabicConfig {
  text: string;
}

export interface ShippingArabicConfig {
  hubName: string;
  dispatchBadgeText: string;
  guaranteeBadgeText: string;
  deliveryEstimate: string;
  perk1Title?: string;
  perk1Desc?: string;
  perk2Title?: string;
  perk2Desc?: string;
  perk3Title?: string;
  perk3Desc?: string;
}

export interface EditorialArabicConfig {
  siteTagline: string;
  footerQuote: string;
  authenticityGuaranteeText: string;
  shippingPolicyText: string;
  returnPolicyText: string;
  privacyPolicyText?: string;
  footerDescription: string;
  hubCities: string;
}

export interface NewReleasesArabicConfig {
  badgeText: string;
  headline: string;
  viewAllText: string;
}

export interface MangaDiscoveryArabicConfig {
  badgeText: string;
  title: string;
  description: string;
  searchPlaceholder: string;
  catalogLinkText: string;
}

export interface GenreBentoArabicConfig {
  badgeText: string;
  title: string;
  description: string;
}

export interface TrendingArabicConfig {
  badgeText: string;
  headline: string;
}

const DEFAULT_TICKER_CONFIG: TickerConfig = {
  enabled: false,
  messages: [
    "FREE SHIPPING ON ORDERS OVER EGP 500",
    "AUTHENTIC VIZ MEDIA ENGLISH EDITIONS",
    "CASH ON DELIVERY ACROSS EGYPT",
  ],
  speedSeconds: 30,
  linkHref: "",
  placements: ["after-hero"],
};

const DEFAULT_TICKER_ARABIC_CONFIG: TickerArabicConfig = {
  messages: [
    "شحن مجاني للطلبات فوق ٥٠٠ جنيه",
    "إصدارات بأعلى جودة",
    "الدفع عند الاستلام في كل محافظات مصر",
  ],
};

const DEFAULT_BOX_SETS_CONFIG: BoxSetsConfig = {
  badgeText: "COMPLETE COLLECTIONS",
  headline: "BOX SETS",
  autoplayEnabled: true,
  autoplaySpeed: 4200,
};

const DEFAULT_TRENDING_CONFIG: TrendingConfig = {
  badgeText: "CURATED SELECTION",
  headline: "TRENDING NOW",
  minCards: 8,
  autoplayEnabled: true,
  autoplaySpeed: 3800,
};

const DEFAULT_NEW_RELEASES_CONFIG: NewReleasesConfig = {
  badgeText: "JUST ARCHIVED",
  headline: "NEW RELEASES",
  viewAllText: "VIEW COMPLETE ARCHIVE",
};

const DEFAULT_HERO_CONTENT: HeroContent = {
  badgeText: "CHAPTER 01 — 物語の始まり",
  headlineLine1: "DISCOVER",
  headlineHighlight: "YOUR NEXT",
  headlineLine2: "STORY",
  headline: "DISCOVER YOUR NEXT STORY",
  subheadline: "Manga, light novels, and stories worth getting lost in. From pristine First Editions and oversize Deluxe hardcovers to complete collector slipcase box sets.",
  japaneseWatermark1: "物語の始まり",
  japaneseWatermark2: "精神と物質の調和",
  primaryCtaText: "EXPLORE MANGA",
  primaryCtaLink: "/manga",
  secondaryCtaText: "NEW RELEASES",
  secondaryCtaLink: "#new-releases",
  stat1Value: "1,400+",
  stat1Label: "Volumes Archived",
  stat2Value: "100%",
  stat2Label: "Premium Quality Editions",
  stat3Value: "24-48h",
  stat3Label: "All Egypt Delivery",
  featuredVolumeId: "tokyo-ghoul-1",
};

const DEFAULT_ANNOUNCEMENT: AnnouncementConfig = {
  enabled: true,
  text: "INAUGURAL PATRON GRANT — RECEIVE 20% OFF YOUR FIRST CURATED ARCHIVE WITH VOUCHER",
  voucherCode: "ANIMEVERSE20",
  discountPercent: 20,
};

const DEFAULT_SHIPPING_CONFIG: ShippingConfig = {
  hubName: "6TH OF OCTOBER • EGYPT",
  dispatchBadgeText: "Dispatched from 6th of October (All Egypt)",
  guaranteeBadgeText: "Authenticity Guaranteed",
  deliveryEstimate: "24-48h",
  standardShippingCost: 65,
  governorateRates: DEFAULT_GOVERNORATE_RATES,
  governoratesList: EGYPT_GOVERNORATES,
  freeShippingEnabled: true,
  freeShippingThreshold: 500,
  perk1Title: "EGYPT-WIDE EXPRESS DISPATCH",
  perk1Desc: "Central archive hub in 6th of October City. Direct delivery to all Egyptian governorates with protective reinforced slip-sleeves.",
  perk2Title: "AUTHENTIC JAPANESE EDITIONS",
  perk2Desc: "100% licensed Tankōbon, Kanzenban, and oversized collector hardcovers.",
  perk3Title: "COLLECTOR REPLACEMENT GUARANTEE",
  perk3Desc: "Corner protection assurance. We replace any volume damaged during transit.",
};

const DEFAULT_EDITORIAL: EditorialConfig = {
  siteTagline: "Japanese Manga & Editorial Storefront",
  footerQuote: "In the quiet chambers between panels, human truths linger. ANIMEVERSE stands as an altar to physical print, Japanese craft, and uncompromising sequential art.",
  contactEmail: "animeversebooks@gmail.com",
  contactPhone: "+20 10 36225385",
  ownerName: "Mahmoud Waleed",
  authenticityGuaranteeText: "Every single volume in the ANIMEVERSE archive is sourced directly from certified Tokyo and Kyoto publishing houses. We guarantee 100% genuine Kodansha, Shueisha, Shogakukan, and Dark Horse editorial pressings.",
  shippingPolicyText: "Orders are hand-packaged using archival protective sleeves, reinforced corner bumpers, and moisture-resistant sealing. Dispatched daily across Cairo, Giza, Alexandria, and all Egyptian governorates.",
  returnPolicyText: "We honor a 14-day archival integrity inspection. If your volume arrives with any structural binding defect, spine dent, or print anomaly, our concierge provides immediate replacement.",
  privacyPolicyText: "Your privacy is paramount. ANIMEVERSE adheres to strict data minimization standards and the Egyptian Data Protection Law (Law No. 151 of 2020). We never sell, rent, or trade your phone number, delivery address, or reading preferences.",
  footerDescription: "An editorial archive celebrating sequential art, Japanese literary epics, and tactile physical printing craftsmanship.",
  hubCities: "6TH OF OCTOBER • CAIRO • ALEXANDRIA • ALL EGYPT",
};

const DEFAULT_FEATURED_SERIES: FeaturedSeriesConfig = {
  seriesSlug: "jujutsu-kaisen",
  badgeText: "FEATURED SERIES — 呪術廻戦",
  customTitle: "",
  customDescription: "",
  ctaText: "EXPLORE SERIES ARCHIVE",
  ctaLink: "/series/jujutsu-kaisen",
  customImage: "",
};

const DEFAULT_GENRE_BENTO: GenreBentoConfig = {
  badgeText: "CATEGORY DIRECTORY",
  title: "EXPLORE YOUR GENRE",
  description: "Curated reading lists across 9 canonical categories.",
};

const DEFAULT_MANGA_DISCOVERY_CONFIG: MangaDiscoveryConfig = {
  badgeText: "INSTANT ARCHIVAL LOOKUP",
  title: "FIND YOUR NEXT MANGA",
  description: "Query across titles, authors, genres, or ISBN registry.",
  searchPlaceholder: "Search manga, author, or series... (e.g. Eiichiro Oda, Dark Fantasy, Solo Leveling)",
  catalogLinkText: "GO TO COMPLETE MANGA CATALOG",
  defaultTab: "POPULAR",
  displayCount: 4,
};

const DEFAULT_HERO_ARABIC_CONTENT: HeroArabicContent = {
  badgeText: "الفصل الأول — بداية الحكاية",
  headlineLine1: "اكتشف",
  headlineHighlight: "حكايتك",
  headlineLine2: "القادمة",
  headline: "اكتشف حكايتك القادمة",
  subheadline: "مانجا، وروايات خفيفة، وقصص تأخذك لعوالم استثنائية. من الطبعات الأولى الفاخرة والمجلدات الكبيرة المقواة، حتى بوكس سيت كاملة للمقتنين.",
  primaryCtaText: "استكشف المانجا",
  primaryCtaLink: "/manga",
  secondaryCtaText: "أحدث الإصدارات",
  secondaryCtaLink: "#new-releases",
  stat1Value: "+١,٤٠٠",
  stat1Label: "مجلّد في الأرشيف",
  stat2Value: "١٠٠٪",
  stat2Label: "إصدارات بأعلى جودة",
  stat3Value: "٢٤-٤٨ ساعة",
  stat3Label: "توصيل لكل محافظات مصر",
};

const DEFAULT_ANNOUNCEMENT_ARABIC: AnnouncementArabicConfig = {
  text: "منحة الافتتاح للأعضاء — احصل على خصم 20% على طلبك الأول باستخدام كود الخصم",
};

const DEFAULT_SHIPPING_ARABIC_CONFIG: ShippingArabicConfig = {
  hubName: "مدينة 6 أكتوبر • مصر",
  dispatchBadgeText: "يتم الشحن من مستودع 6 أكتوبر (لكافة المحافظات)",
  guaranteeBadgeText: "طبعات أصلية مضمونة 100%",
  deliveryEstimate: "٢٤-٤٨ ساعة",
  perk1Title: "شحن سريع لجميع محافظات مصر",
  perk1Desc: "مستودع الأرشيف الرئيسي بمدينة 6 أكتوبر. شحن مباشر وآمن لكافة المحافظات مع تغليف مدعّم لحماية زوايا المجلدات.",
  perk2Title: "طبعات يابانية أصلية معتمدة",
  perk2Desc: "طبعات أصلية 100% Tankōbon و Kanzenban ومجلدات فاخرة غلاف مقوى مباشرة من دور النشر الرسمية.",
  perk3Title: "ضمان الاستبدال الفوري للمقتنين",
  perk3Desc: "حماية فائقة للأغلفة والزوايا. نقوم باستبدال أي مجلد قد يتعرض لأي ضرر أثناء الشحن فوراً.",
};

const DEFAULT_EDITORIAL_ARABIC: EditorialArabicConfig = {
  siteTagline: "متجر وأرشيف المانجا اليابانية الفاخرة",
  footerQuote: "في السكون بين كادرات الصفحات، تسكن الحكايات وتخلد المشاعر. كايْرو هو محراب للفن التسلسلي والطباعة اليابانية المتقنة.",
  authenticityGuaranteeText: "كل مجلد في أرشيف كايْرو مستورد مباشرة من دور النشر الرسمية في طوكيو وكيوتو. نضمن طبعات أصلية 100% من Kodansha و Shueisha و Shogakukan و Dark Horse.",
  shippingPolicyText: "تغليف يدوي أرشيفي فائق العناية مع حواجز صدمات لحماية الزوايا وغلاف مقاوم للرطوبة. شحن يومي مباشر للقاهرة، الجيزة، الإسكندرية، وكافة محافظات مصر.",
  returnPolicyText: "نلتزم بفحص الأمانة الأرشيفية لمدة 14 يوماً. إذا وصلك أي مجلد به عيب مصنعي في التجليد أو أثر صدمة أثناء الشحن، نقوم باستبداله فوراً.",
  privacyPolicyText: "خصوصيتك أولويتنا المطلقة. تلتزم كايرو بأعلى معايير حماية البيانات وبقانون حماية البيانات الشخصية المصري (قانون رقم 151 لسنة 2020). لا نقوم ببيع أو مشاركة بياناتك إطلاقاً.",
  footerDescription: "أرشيف أدبي يحتفي بالفن القصصي المصور، والملاحم اليابانية، وإتقان الطباعة الورقية الأصيلة.",
  hubCities: "مدينة 6 أكتوبر • القاهرة • الإسكندرية • كافة المحافظات",
};

/** One titled paragraph inside a policy tab. */
export interface PolicyPoint {
  title: string;
  body: string;
}

/** One delivery-time card in the shipping tab. */
export interface PolicyDeliveryWindow {
  region: string;
  duration: string;
  note: string;
}

/**
 * The rest of the customer-facing Policies dialog.
 *
 * Each tab opens with a paragraph that already lived in `editorialConfig`; the
 * headings, the titled points beneath it, the delivery-time cards and the
 * certificate's tick list were written into the component itself, so a curator
 * could change the opening line and nothing else on a screen that is mostly
 * made of the rest. The same shape serves both languages.
 */
export interface PolicyContentConfig {
  shipping: {
    leadTitle: string;
    windowsTitle: string;
    windows: PolicyDeliveryWindow[];
    points: PolicyPoint[];
    couriers: string;
  };
  authenticity: {
    leadTitle: string;
    certificateTitle: string;
    checks: string[];
    points: PolicyPoint[];
  };
  privacy: { leadTitle: string; points: PolicyPoint[] };
  terms: { leadTitle: string; points: PolicyPoint[] };
}

const DEFAULT_POLICY_CONTENT: PolicyContentConfig = {
  shipping: {
    leadTitle: "Central Dispatch: 6th of October City Hub • Giza, Egypt",
    windowsTitle: "Delivery Windows & Estimates",
    windows: [
      { region: "CAIRO & GIZA", duration: "24 – 48 Hours", note: "Daily express dispatch" },
      { region: "ALEX & DELTA", duration: "2 – 3 Days", note: "Canal Cities included" },
      { region: "UPPER EGYPT & RED SEA", duration: "3 – 4 Days", note: "Full door-to-door transit" },
    ],
    points: [
      {
        title: "Collector Armor Packaging Guarantee",
        body: "Every volume is packed using dual-wall reinforced corrugated cartons, high-density edge guards, and archival slip-sleeves. We strictly forbid thin plastic mailers to preserve crisp, unbent book corners during transit.",
      },
    ],
    couriers: "COURIERS: BOSTA EXPRESS & ARAMEX EGYPT",
  },
  authenticity: {
    leadTitle: "CERTIFICATE OF AUTHENTICITY",
    certificateTitle: "100% GENUINE JAPANESE LICENSED EDITIONS",
    checks: [
      "Official ISBN & Tokyo registry barcoded",
      "Archival acid-free paper stock",
      "Zero counterfeit or bootleg prints",
      "Free replacement for transit corner damage",
    ],
    points: [
      {
        title: "Collector Replacement Guarantee",
        body: "As collectors ourselves, we inspect book jackets, spot-varnishes, and spine corners before packing. If your volume arrives with any physical dent or printing defect, notify us within 14 days for an immediate no-hassle exchange.",
      },
    ],
  },
  privacy: {
    leadTitle: "Patron Data Encryption & Sovereignty",
    points: [
      {
        title: "No Third-Party Data Selling",
        body: "We never sell, rent, or trade your phone number, delivery address, or manga reading preferences to marketing agencies or ad trackers.",
      },
      {
        title: "End-to-End Encrypted Checkout",
        body: "All payment processing via Credit Card or Instapay is handled through PCI-DSS Level 1 compliant gateways. Card numbers are never stored in plain text or saved on our servers.",
      },
      {
        title: "Local Storage & Session Control",
        body: "Cart contents, wishlist volumes, and reading progress are stored locally in your browser and can be purged at any moment via your Account Settings.",
      },
    ],
  },
  terms: {
    leadTitle: "Purchasing Terms & Patron Inspection",
    points: [
      {
        title: "14-Day Return & Replacement:",
        body: "Items that are damaged upon delivery or have binding defects are eligible for replacement within 14 days of receipt. Volumes must be in original condition with publisher sleeves.",
      },
      {
        title: "Package Inspection:",
        body: "Patrons in Egypt have the full right to inspect the external shipping container in the presence of the courier before final signature.",
      },
      {
        title: "Cash on Delivery (COD) Terms:",
        body: "Cash on Delivery is supported across all Egyptian governorates. Repeated uncollected orders may require prepaid verification for future orders.",
      },
    ],
  },
};

const DEFAULT_POLICY_CONTENT_ARABIC: PolicyContentConfig = {
  shipping: {
    leadTitle: "مركز الشحن الرئيسي: مدينة 6 أكتوبر • الجيزة، مصر",
    windowsTitle: "مواعيد وفترات التوصيل حسب المحافظة",
    windows: [
      { region: "القاهرة والجيزة", duration: "خلال 24 – 48 ساعة", note: "شحن يومي مباشر وسريع" },
      { region: "الإسكندرية ومحافظات الدلتا", duration: "خلال 2 – 3 أيام عمل", note: "يشمل مدن القناة" },
      { region: "الصعيد والبحر الأحمر ومطروح", duration: "خلال 3 – 4 أيام عمل", note: "توصيل آمن حتى باب المنزل" },
    ],
    points: [
      {
        title: "ميثاق التغليف المصفح للمقتنين",
        body: "نعتمد كراتين مقوّاة مزدوجة الجدران مع دعامات زوايا متينة وأكياس أرشيفية عازلة لحماية المجلد من أي التواء أو احتكاك أثناء الشحن. نرفض تماماً استخدام الأكياس البلاستيكية الخفيفة حرصاً على سلامة الحواف.",
      },
    ],
    couriers: "شركاء الشحن: بوسطة إكسبريس وأرامكس مصر",
  },
  authenticity: {
    leadTitle: "شهادة الاعتماد والأصالة الأرشيفية",
    certificateTitle: "طبعات رسمية مرخصة 100% من كبرى دور النشر اليابانية",
    checks: [
      "رقم إيداع دولي ISBN وباركود رسمي ياباني",
      "ورق أرشيفي ممتاز خالٍ من الأحماض",
      "خالٍ تماماً من النسخ المقلدة أو غير المصرح بها",
      "استبدال فوري مجاني لأي عيب مصنعي أو تلف شحن",
    ],
    points: [
      {
        title: "ضمان الاستبدال الفوري للمقتنين",
        body: "بصفتنا مقتنين للمانجا قبل كل شيء، نقوم بفحص أغلفة المجلدات ولمعان الحروف وزوايا الكعب بدقة بالغة قبل التغليف. وإذا وصلك أي مجلد به انثناء أو عيب في الطباعة أو التجليد، يحق لك استبداله مجاناً خلال 14 يوماً.",
      },
    ],
  },
  privacy: {
    leadTitle: "تشفير بيانات المقتنين وحماية الخصوصية",
    points: [
      {
        title: "حظر مشاركة أو بيع البيانات تماماً",
        body: "لا نقوم إطلاقاً ببيع أو تأجير أرقام هواتف العملاء أو عناوين الشحن أو تفضيلات القراءة لأي شركات تسويق خارجية أو شبكات إعلانية.",
      },
      {
        title: "دفع آمن ومعالجة مشفرة",
        body: "تتم كافة عمليات الدفع والتحويل عبر قنوات مشفرة وفق بروتوكولات الأمان القياسية PCI-DSS. لا نحتفظ بأي بيانات مصرفية حساسة على خوادمنا.",
      },
      {
        title: "تحكم كامل في جلسة التصفح",
        body: "يتم حفظ محتويات السلة وقائمة الرغبات محلياً في متصفحك، ويمكنك حذفها أو تفريغها بضغطة زر واحدة في أي وقت عبر إعدادات حسابك.",
      },
    ],
  },
  terms: {
    leadTitle: "شروط الشراء وحق المعاينة عند الاستلام",
    points: [
      {
        title: "حق الاستبدال خلال 14 يوماً:",
        body: "إذا استلمت مجلداً به أي تلف أو خطأ في التجليد، يحق لك استبداله خلال 14 يوماً من تاريخ الاستلام، بشرط بقاء الكتاب في حالته الأصلية وغلافه الحافظ.",
      },
      {
        title: "حق المعاينة قبل الاستلام:",
        body: "يحق للعميل معاينة الطرد والتأكد من سلامة التغليف الخارجي في وجود مندوب التوصيل قبل الاستلام والتوقيع النهائي.",
      },
      {
        title: "شروط الدفع عند الاستلام (COD):",
        body: "الدفع عند الاستلام متاح في كافة أنحاء مصر. في حالة تكرار رفض الاستلام بدون مبرر، قد يتم حصر الطلبات المستقبلية على الدفع المسبق.",
      },
    ],
  },
};

const DEFAULT_NEW_RELEASES_ARABIC_CONFIG: NewReleasesArabicConfig = {
  badgeText: "وصل حديثاً للأرشيف",
  headline: "أحدث الإصدارات",
  viewAllText: "تصفح الأرشيف الكامل",
};

const DEFAULT_MANGA_DISCOVERY_ARABIC_CONFIG: MangaDiscoveryArabicConfig = {
  badgeText: "البحث الفوري في الأرشيف",
  title: "ابحث عن مجلدك القادم",
  description: "ابحث مباشرة بين العناوين، والمؤلفين، والتصنيفات، أو الأرقام المعيارية.",
  searchPlaceholder: "ابحث باسم المانجا، الكاتب، أو التصنيف... (مثل: Eiichiro Oda, Dark Fantasy)",
  catalogLinkText: "الانتقال لكتالوج المانجا الكامل",
};

const DEFAULT_BOX_SETS_ARABIC_CONFIG: BoxSetsArabicConfig = {
  badgeText: "المجموعات الكاملة",
  headline: "طقم المجموعة الكاملة",
};

const DEFAULT_TRENDING_ARABIC_CONFIG: TrendingArabicConfig = {
  badgeText: "مختارات الأرشيف",
  headline: "الأكثر رواجاً الآن",
};

const DEFAULT_GENRE_BENTO_ARABIC_CONFIG: GenreBentoArabicConfig = {
  badgeText: "دليل التصنيفات",
  title: "استكشف تصنيفك المفضل",
  description: "قوائم قراءة منتقاة بعناية عبر 9 تصنيفات رئيسية.",
};

export const DEFAULT_FORMATS: string[] = [
  "Manga",
  "Deluxe Edition",
  "Box Set",
  "Light Novel",
];

export type LiveEditTarget =
  | { type: "volume"; volumeId: string }
  | { type: "series"; seriesSlug: string }
  | { type: "new-series" }
  | { type: "hero" }
  | { type: "hero-card" }
  | { type: "trending" }
  | { type: "box-sets" }
  | { type: "ticker" }
  | { type: "new-releases" }
  | { type: "genre-bento" }
  | { type: "announcement" }
  | { type: "featured-series" }
  | { type: "featured-series-card" }
  | { type: "shipping" }
  // The footer's own brand copy and the customer-facing policy texts live in
  // the same config object but are edited from two different places on the
  // page, so they get a live-edit target each.
  | { type: "footer" }
  | { type: "editorial"; tab?: "shipping" | "authenticity" | "privacy" | "terms" }
  | { type: "manga-discovery" }
  | { type: "shop-showcase" }
  | { type: "genre-card"; genreId: string };

export interface StorefrontState {
  // Data
  volumes: MangaVolume[];
  series: Series[];
  genres: GenreInfo[];
  formats: string[];

  // CMS Content
  heroContent: HeroContent;
  announcement: AnnouncementConfig;
  shippingConfig: ShippingConfig;
  editorialConfig: EditorialConfig;
  featuredSeriesConfig: FeaturedSeriesConfig;
  genreBentoConfig: GenreBentoConfig;
  tickerConfig: TickerConfig;
  boxSetsConfig: BoxSetsConfig;
  trendingConfig: TrendingConfig;
  newReleasesConfig: NewReleasesConfig;
  mangaDiscoveryConfig: MangaDiscoveryConfig;
  shopShowcaseConfig: ShopShowcaseConfig;
  shopShowcaseArabicConfig: ShopShowcaseArabicConfig;

  // Arabic CMS Content Overrides
  heroArabicContent: HeroArabicContent;
  announcementArabic: AnnouncementArabicConfig;
  shippingArabicConfig: ShippingArabicConfig;
  editorialArabicConfig: EditorialArabicConfig;
  newReleasesArabicConfig: NewReleasesArabicConfig;
  mangaDiscoveryArabicConfig: MangaDiscoveryArabicConfig;
  tickerArabicConfig: TickerArabicConfig;
  boxSetsArabicConfig: BoxSetsArabicConfig;
  trendingArabicConfig: TrendingArabicConfig;
  genreBentoArabicConfig: GenreBentoArabicConfig;
  policyContent: PolicyContentConfig;
  policyContentArabic: PolicyContentConfig;

  /**
   * True once the catalogue has been fetched from the server, whether that
   * succeeded or failed. Until then the store still holds the defaults bundled
   * into the JS, which contain only the products that existed at build time —
   * so a page that looks a product up by id has to wait for this before
   * deciding the product does not exist.
   */
  catalogLoaded: boolean;

  // Admin Access & Live Visual Editor
  isAdminAuthenticated: boolean;
  isVisualEditorActive: boolean;
  activeLiveEditTarget: LiveEditTarget | null;
  adminSessionToken?: string | null;
  adminEmails: string[];

  // Live Visual Editor Actions
  setVisualEditorActive: (active: boolean) => void;
  openLiveEdit: (target: LiveEditTarget) => void;
  closeLiveEdit: () => void;

  // Catalog Actions
  addVolume: (volume: MangaVolume) => void;
  updateVolume: (id: string, updates: Partial<MangaVolume>) => void;
  deleteVolume: (id: string) => void;
  duplicateVolume: (id: string) => MangaVolume | null;
  deductStock: (items: { volumeId: string; quantity: number }[]) => void;

  // Series Actions
  addSeries: (series: Series) => void;
  updateSeries: (slug: string, updates: Partial<Series>) => void;
  deleteSeries: (slug: string) => void;

  // CMS Content Actions
  updateHeroContent: (updates: Partial<HeroContent>) => void;
  updateAnnouncement: (updates: Partial<AnnouncementConfig>) => void;
  updateShippingConfig: (updates: Partial<ShippingConfig>) => void;
  updateEditorialConfig: (updates: Partial<EditorialConfig>) => void;
  updateFeaturedSeriesConfig: (updates: Partial<FeaturedSeriesConfig>) => void;
  updateGenreBentoConfig: (updates: Partial<GenreBentoConfig>) => void;
  updateTickerConfig: (updates: Partial<TickerConfig>) => void;
  updateTickerArabicConfig: (updates: Partial<TickerArabicConfig>) => void;
  updateBoxSetsConfig: (updates: Partial<BoxSetsConfig>) => void;
  updateBoxSetsArabicConfig: (updates: Partial<BoxSetsArabicConfig>) => void;
  updateTrendingConfig: (updates: Partial<TrendingConfig>) => void;
  updateNewReleasesConfig: (updates: Partial<NewReleasesConfig>) => void;
  updateMangaDiscoveryConfig: (updates: Partial<MangaDiscoveryConfig>) => void;
  updateShopShowcaseConfig: (updates: Partial<ShopShowcaseConfig>) => void;
  updateShopShowcaseArabicConfig: (updates: Partial<ShopShowcaseArabicConfig>) => void;

  // Arabic CMS Content Actions
  updateHeroArabicContent: (updates: Partial<HeroArabicContent>) => void;
  updateAnnouncementArabic: (updates: Partial<AnnouncementArabicConfig>) => void;
  updateShippingArabicConfig: (updates: Partial<ShippingArabicConfig>) => void;
  updateEditorialArabicConfig: (updates: Partial<EditorialArabicConfig>) => void;
  updateNewReleasesArabicConfig: (updates: Partial<NewReleasesArabicConfig>) => void;
  updateMangaDiscoveryArabicConfig: (updates: Partial<MangaDiscoveryArabicConfig>) => void;
  updateTrendingArabicConfig: (updates: Partial<TrendingArabicConfig>) => void;
  updateGenreBentoArabicConfig: (updates: Partial<GenreBentoArabicConfig>) => void;
  updatePolicyContent: (updates: Partial<PolicyContentConfig>) => void;
  updatePolicyContentArabic: (updates: Partial<PolicyContentConfig>) => void;

  // Cloud Neon DB Direct Synchronization
  syncToNeon: () => Promise<{ success: boolean }>;
  addGenre: (genre: GenreInfo) => void;
  updateGenre: (id: string, updates: Partial<GenreInfo>) => void;
  deleteGenre: (id: string) => void;
  addFormat: (format: string) => void;

  // Admin Auth Actions
  loginAdmin: (pin: string, userEmail?: string) => boolean;
  loginAdminWithToken: (token: string) => void;
  logoutAdmin: () => void;
  addAdminEmail: (email: string) => Promise<{ success: boolean; message: string }>;
  removeAdminEmail: (email: string) => Promise<{ success: boolean; message: string }>;
  isAuthorizedAdmin: (email?: string) => boolean;

  // Utilities
  resetToDefaults: () => void;
  exportData: () => string;
  importData: (jsonStr: string) => boolean;
}

export const useStorefrontStore = create<StorefrontState>()(
  persist(
    (set, get) => ({
      volumes: ALL_VOLUMES,
      series: ALL_SERIES,
      genres: GENRES,
      formats: DEFAULT_FORMATS,
      heroContent: DEFAULT_HERO_CONTENT,
      announcement: DEFAULT_ANNOUNCEMENT,
      shippingConfig: DEFAULT_SHIPPING_CONFIG,
      editorialConfig: DEFAULT_EDITORIAL,
      featuredSeriesConfig: DEFAULT_FEATURED_SERIES,
      genreBentoConfig: DEFAULT_GENRE_BENTO,
      tickerConfig: DEFAULT_TICKER_CONFIG,
      boxSetsConfig: DEFAULT_BOX_SETS_CONFIG,
      trendingConfig: DEFAULT_TRENDING_CONFIG,
      newReleasesConfig: DEFAULT_NEW_RELEASES_CONFIG,
      mangaDiscoveryConfig: DEFAULT_MANGA_DISCOVERY_CONFIG,
      shopShowcaseConfig: DEFAULT_SHOP_SHOWCASE_CONFIG,
      shopShowcaseArabicConfig: DEFAULT_SHOP_SHOWCASE_ARABIC_CONFIG,
      heroArabicContent: DEFAULT_HERO_ARABIC_CONTENT,
      announcementArabic: DEFAULT_ANNOUNCEMENT_ARABIC,
      shippingArabicConfig: DEFAULT_SHIPPING_ARABIC_CONFIG,
      editorialArabicConfig: DEFAULT_EDITORIAL_ARABIC,
      newReleasesArabicConfig: DEFAULT_NEW_RELEASES_ARABIC_CONFIG,
      mangaDiscoveryArabicConfig: DEFAULT_MANGA_DISCOVERY_ARABIC_CONFIG,
      tickerArabicConfig: DEFAULT_TICKER_ARABIC_CONFIG,
      boxSetsArabicConfig: DEFAULT_BOX_SETS_ARABIC_CONFIG,
      trendingArabicConfig: DEFAULT_TRENDING_ARABIC_CONFIG,
      genreBentoArabicConfig: DEFAULT_GENRE_BENTO_ARABIC_CONFIG,
      policyContent: DEFAULT_POLICY_CONTENT,
      policyContentArabic: DEFAULT_POLICY_CONTENT_ARABIC,
      catalogLoaded: false,
      isAdminAuthenticated: false,
      isVisualEditorActive: true,
      activeLiveEditTarget: null,
      adminSessionToken: null,
      // Seeded from the curator-gated API once an admin signs in; shipping the
      // real allow-list as a default put those addresses in the public bundle.
      adminEmails: [],

      setVisualEditorActive: (active) => set({ isVisualEditorActive: active }),
      openLiveEdit: (target) => set({ activeLiveEditTarget: target }),
      closeLiveEdit: () => set({ activeLiveEditTarget: null }),

      addVolume: (newVolume) => {
        set((state) => {
          const exists = state.volumes.some((v) => v.id === newVolume.id);
          const finalId = exists ? `${newVolume.id}-${Date.now()}` : newVolume.id;
          const volumeWithId = { ...newVolume, id: finalId };
          const updatedVolumes = [volumeWithId, ...state.volumes];

          const updatedSeries = state.series.map((s) => {
            if (s.slug === volumeWithId.seriesSlug) {
              const alreadyHas = s.volumes.some((v) => v.id === volumeWithId.id);
              return {
                ...s,
                totalVolumes: Math.max(s.totalVolumes, s.volumes.length + 1),
                volumes: alreadyHas ? s.volumes : [...s.volumes, volumeWithId],
              };
            }
            return s;
          });

          return { volumes: updatedVolumes, series: updatedSeries };
        });
      },

      updateVolume: (id, updates) => {
        set((state) => {
          const updatedVolumes = state.volumes.map((v) =>
            v.id === id ? { ...v, ...updates } : v
          );

          const updatedSeries = state.series.map((s) => ({
            ...s,
            volumes: s.volumes.map((v) => (v.id === id ? { ...v, ...updates } : v)),
          }));

          return { volumes: updatedVolumes, series: updatedSeries };
        });
      },

      deleteVolume: (id) => {
        set((state) => {
          const updatedVolumes = state.volumes.filter((v) => v.id !== id);
          const updatedSeries = state.series.map((s) => ({
            ...s,
            volumes: s.volumes.filter((v) => v.id !== id),
          }));
          return { volumes: updatedVolumes, series: updatedSeries };
        });
      },

      duplicateVolume: (id) => {
        const current = get().volumes.find((v) => v.id === id);
        if (!current) return null;

        const newId = `${current.id}-copy-${Date.now().toString().slice(-4)}`;
        const duplicated: MangaVolume = {
          ...current,
          id: newId,
          title: `${current.title} (Archival Duplicate)`,
          volumeNumber: current.volumeNumber + 1,
        };

        get().addVolume(duplicated);
        return duplicated;
      },

      deductStock: (items) => {
        set((state) => {
          const qtyMap = new Map<string, number>();
          items.forEach((item) => {
            qtyMap.set(item.volumeId, (qtyMap.get(item.volumeId) || 0) + item.quantity);
          });

          const updatedVolumes = state.volumes.map((v) => {
            // A figure or poster is sold per variant: its lines carry the
            // variant row id, so the deduction lands on that variant.
            if (isMerch(v)) {
              const variants = (v.variants || []).map((variant) => {
                const qty = qtyMap.get(variantRowId(v.id, variant.sku));
                return qty ? { ...variant, stock: Math.max(0, (variant.stock || 0) - qty) } : variant;
              });
              return withVariantSummary({ ...v, variants });
            }
            const deductQty = qtyMap.get(v.id);
            if (deductQty) {
              return { ...v, stock: Math.max(0, (v.stock || 0) - deductQty) };
            }
            return v;
          });

          const updatedSeries = state.series.map((s) => ({
            ...s,
            volumes: s.volumes.map((v) => {
              const deductQty = qtyMap.get(v.id);
              if (deductQty) {
                return { ...v, stock: Math.max(0, (v.stock || 0) - deductQty) };
              }
              return v;
            }),
          }));

          return { volumes: updatedVolumes, series: updatedSeries };
        });
      },

      addSeries: (newSeries) => {
        set((state) => {
          const exists = state.series.some((s) => s.slug === newSeries.slug);
          const finalSlug = exists ? `${newSeries.slug}-${Date.now().toString().slice(-4)}` : newSeries.slug;
          const seriesWithSlug = { ...newSeries, slug: finalSlug };
          return { series: [seriesWithSlug, ...state.series] };
        });
      },

      updateSeries: (slug, updates) => {
        set((state) => {
          const exists = state.series.some((s) => s.slug === slug);
          if (exists) {
            return {
              series: state.series.map((s) => (s.slug === slug ? { ...s, ...updates } : s)),
            };
          }
          const fallback = ALL_SERIES.find((s) => s.slug === slug);
          if (fallback) {
            return {
              series: [...state.series, { ...fallback, ...updates }],
            };
          }
          return state;
        });
      },

      deleteSeries: (slug) => {
        set((state) => ({
          series: state.series.filter((s) => s.slug !== slug),
          volumes: state.volumes.filter((v) => v.seriesSlug !== slug),
        }));
      },

      updateHeroContent: (updates) => {
        set((state) => ({
          heroContent: { ...state.heroContent, ...updates },
        }));
      },

      updateAnnouncement: (updates) => {
        set((state) => ({
          announcement: { ...state.announcement, ...updates },
        }));
      },

      updateShippingConfig: (updates) => {
        set((state) => ({
          shippingConfig: { ...state.shippingConfig, ...updates },
        }));
      },

      updateEditorialConfig: (updates) => {
        set((state) => ({
          editorialConfig: { ...state.editorialConfig, ...updates },
        }));
      },

      updateFeaturedSeriesConfig: (updates) => {
        set((state) => ({
          featuredSeriesConfig: { ...state.featuredSeriesConfig, ...updates },
        }));
      },

      updateGenreBentoConfig: (updates) => {
        set((state) => ({
          genreBentoConfig: { ...state.genreBentoConfig, ...updates },
        }));
      },

      updateTickerConfig: (updates) => {
        set((state) => ({ tickerConfig: { ...state.tickerConfig, ...updates } }));
      },

      updateTickerArabicConfig: (updates) => {
        set((state) => ({ tickerArabicConfig: { ...state.tickerArabicConfig, ...updates } }));
      },

      updateBoxSetsConfig: (updates) => {
        set((state) => ({
          boxSetsConfig: { ...state.boxSetsConfig, ...updates },
        }));
      },

      updateBoxSetsArabicConfig: (updates) => {
        set((state) => ({
          boxSetsArabicConfig: { ...state.boxSetsArabicConfig, ...updates },
        }));
      },

      updateShopShowcaseConfig: (updates) => {
        set((state) => ({
          shopShowcaseConfig: { ...DEFAULT_SHOP_SHOWCASE_CONFIG, ...state.shopShowcaseConfig, ...updates },
        }));
      },

      updateShopShowcaseArabicConfig: (updates) => {
        set((state) => ({
          shopShowcaseArabicConfig: { ...DEFAULT_SHOP_SHOWCASE_ARABIC_CONFIG, ...state.shopShowcaseArabicConfig, ...updates },
        }));
      },

      updateTrendingConfig: (updates) => {
        set((state) => ({
          trendingConfig: { ...state.trendingConfig, ...updates },
        }));
      },

      updateNewReleasesConfig: (updates) => {
        set((state) => ({
          newReleasesConfig: { ...state.newReleasesConfig, ...updates },
        }));
      },

      updateMangaDiscoveryConfig: (updates) => {
        set((state) => ({
          mangaDiscoveryConfig: { ...state.mangaDiscoveryConfig, ...updates },
        }));
      },

      updateHeroArabicContent: (updates) => {
        set((state) => ({
          heroArabicContent: { ...state.heroArabicContent, ...updates },
        }));
      },

      updateAnnouncementArabic: (updates) => {
        set((state) => ({
          announcementArabic: { ...state.announcementArabic, ...updates },
        }));
      },

      updateShippingArabicConfig: (updates) => {
        set((state) => ({
          shippingArabicConfig: { ...state.shippingArabicConfig, ...updates },
        }));
      },

      updateEditorialArabicConfig: (updates) => {
        set((state) => ({
          editorialArabicConfig: { ...state.editorialArabicConfig, ...updates },
        }));
      },

      updateNewReleasesArabicConfig: (updates) => {
        set((state) => ({
          newReleasesArabicConfig: { ...state.newReleasesArabicConfig, ...updates },
        }));
      },

      updateMangaDiscoveryArabicConfig: (updates) => {
        set((state) => ({
          mangaDiscoveryArabicConfig: { ...state.mangaDiscoveryArabicConfig, ...updates },
        }));
      },

      updateTrendingArabicConfig: (updates) => {
        set((state) => ({
          trendingArabicConfig: { ...state.trendingArabicConfig, ...updates },
        }));
      },

      updateGenreBentoArabicConfig: (updates) => {
        set((state) => ({
          genreBentoArabicConfig: { ...state.genreBentoArabicConfig, ...updates },
        }));
      },

      updatePolicyContent: (updates) => {
        set((state) => ({ policyContent: { ...state.policyContent, ...updates } }));
      },

      updatePolicyContentArabic: (updates) => {
        set((state) => ({ policyContentArabic: { ...state.policyContentArabic, ...updates } }));
      },

      /**
       * The console's "Sync" button: pushes the whole payload immediately
       * instead of waiting on the debounce in StorefrontDataSync.
       *
       * The key list lives in one place now. A second copy lived here and had
       * already drifted once — a key added to the sync component would go on
       * being saved automatically while this button quietly dropped it.
       */
      syncToNeon: async () => {
        const state = get() as unknown as Record<string, unknown>;
        const data = Object.fromEntries(STOREFRONT_DATA_KEYS.map((k) => [k, state[k]]));
        // Series carry no volume list of their own; sending one would store a
        // second copy of the catalogue that can then drift from the first.
        data.series = withoutSeriesVolumes(data.series);
        try {
          const res = await fetch("/api/storefront", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data }),
          });
          const json = await res.json().catch(() => ({}));
          const ok = Boolean(res.ok && json.success);
          useCuratorSaveStore.getState().report(
            ok ? "saved" : "error",
            ok ? "" : json?.message || `The server refused the change (${res.status}).`
          );
          return { success: ok };
        } catch {
          useCuratorSaveStore
            .getState()
            .report("error", "Could not reach the server. Your change is still here — check your connection and retry.");
          return { success: false };
        }
      },

      addGenre: (newGenre) => {
        set((state) => {
          const rawId = newGenre.id?.trim() || newGenre.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
          const exists = state.genres.some((g) => g.id === rawId);
          const finalId = exists ? `${rawId}-${Date.now()}` : rawId;
          return {
            genres: [...state.genres, { ...newGenre, id: finalId }],
          };
        });
      },

      updateGenre: (id, updates) => {
        set((state) => ({
          genres: state.genres.map((g) => (g.id === id ? { ...g, ...updates } : g)),
        }));
      },

      deleteGenre: (id) => {
        set((state) => ({
          genres: state.genres.filter((g) => g.id !== id),
        }));
      },

      addFormat: (newFormat) => {
        const trimmed = newFormat.trim();
        if (!trimmed) return;
        set((state) => {
          const currentFormats = state.formats && state.formats.length > 0 ? state.formats : DEFAULT_FORMATS;
          if (currentFormats.some((f) => f.toLowerCase() === trimmed.toLowerCase())) {
            return state;
          }
          return { formats: [...currentFormats, trimmed] };
        });
      },

      loginAdmin: (pin, userEmail) => {
        // The PIN and curator identity are verified by /api/admin/verify-pin.
        // This flag controls only client UI; it must never be treated as authorization.
        void pin;
        void userEmail;
        set({ isAdminAuthenticated: true });
        return true;
      },

      loginAdminWithToken: (token) => {
        set({ isAdminAuthenticated: true, adminSessionToken: token });
      },

      logoutAdmin: () => {
        // Clear every client-only editor state immediately. Server-side access
        // remains protected by the HttpOnly curator cookie and is revoked below.
        set({
          isAdminAuthenticated: false,
          adminSessionToken: null,
          isVisualEditorActive: false,
          activeLiveEditTarget: null,
        });
        if (typeof fetch !== "undefined") {
          fetch("/api/admin/verify-session", { method: "DELETE" }).catch(() => {});
        }
        if (typeof document !== "undefined") {
          document.cookie = "kairo_curator_session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        }
        try {
          localStorage.removeItem("kairo_storefront_cms_v3");
          // Notify other open tabs to immediately remove curator-only UI.
          localStorage.setItem("kairo_admin_logout", String(Date.now()));
        } catch {}
      },

      // The allow-list is server state. These used to mutate a local array
      // only, so "Add Admin" granted nothing and the next session check
      // silently replaced the list with the server's.
      addAdminEmail: async (email) => {
        const normalized = email.trim().toLowerCase();
        if (!normalized) return { success: false, message: "No email supplied." };
        try {
          const res = await fetch("/api/admin/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: normalized }),
          });
          const json = await res.json().catch(() => ({}));
          if (Array.isArray(json.adminEmails)) set({ adminEmails: json.adminEmails });
          return { success: Boolean(json.success), message: json.message || "Could not update the administrator list." };
        } catch {
          return { success: false, message: "Network error updating the administrator list." };
        }
      },

      removeAdminEmail: async (email) => {
        const normalized = email.trim().toLowerCase();
        if (!normalized) return { success: false, message: "No email supplied." };
        try {
          const res = await fetch("/api/admin/emails", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: normalized }),
          });
          const json = await res.json().catch(() => ({}));
          if (Array.isArray(json.adminEmails)) set({ adminEmails: json.adminEmails });
          return { success: Boolean(json.success), message: json.message || "Could not update the administrator list." };
        } catch {
          return { success: false, message: "Network error updating the administrator list." };
        }
      },

      isAuthorizedAdmin: (email) => {
        if (!email) return false;
        const list = get().adminEmails || [];
        return list.some((e) => e.trim().toLowerCase() === email.trim().toLowerCase());
      },

      resetToDefaults: () => {
        set({
          volumes: ALL_VOLUMES,
          series: ALL_SERIES,
          genres: GENRES,
          formats: DEFAULT_FORMATS,
          heroContent: DEFAULT_HERO_CONTENT,
          announcement: DEFAULT_ANNOUNCEMENT,
          shippingConfig: DEFAULT_SHIPPING_CONFIG,
          editorialConfig: DEFAULT_EDITORIAL,
          featuredSeriesConfig: DEFAULT_FEATURED_SERIES,
              genreBentoConfig: DEFAULT_GENRE_BENTO,
          tickerConfig: DEFAULT_TICKER_CONFIG,
          boxSetsConfig: DEFAULT_BOX_SETS_CONFIG,
          trendingConfig: DEFAULT_TRENDING_CONFIG,
          newReleasesConfig: DEFAULT_NEW_RELEASES_CONFIG,
          mangaDiscoveryConfig: DEFAULT_MANGA_DISCOVERY_CONFIG,
          shopShowcaseConfig: DEFAULT_SHOP_SHOWCASE_CONFIG,
          shopShowcaseArabicConfig: DEFAULT_SHOP_SHOWCASE_ARABIC_CONFIG,
          heroArabicContent: DEFAULT_HERO_ARABIC_CONTENT,
          announcementArabic: DEFAULT_ANNOUNCEMENT_ARABIC,
          shippingArabicConfig: DEFAULT_SHIPPING_ARABIC_CONFIG,
          editorialArabicConfig: DEFAULT_EDITORIAL_ARABIC,
          newReleasesArabicConfig: DEFAULT_NEW_RELEASES_ARABIC_CONFIG,
          mangaDiscoveryArabicConfig: DEFAULT_MANGA_DISCOVERY_ARABIC_CONFIG,
          tickerArabicConfig: DEFAULT_TICKER_ARABIC_CONFIG,
          boxSetsArabicConfig: DEFAULT_BOX_SETS_ARABIC_CONFIG,
          trendingArabicConfig: DEFAULT_TRENDING_ARABIC_CONFIG,
          genreBentoArabicConfig: DEFAULT_GENRE_BENTO_ARABIC_CONFIG,
          policyContent: DEFAULT_POLICY_CONTENT,
          policyContentArabic: DEFAULT_POLICY_CONTENT_ARABIC,
        });
      },

      exportData: () => {
        const state = get();
        const exportPayload = {
          version: "1.0",
          exportedAt: new Date().toISOString(),
          volumes: state.volumes,
          series: state.series,
          genres: state.genres,
          formats: state.formats || DEFAULT_FORMATS,
          heroContent: state.heroContent,
          announcement: state.announcement,
          shippingConfig: state.shippingConfig,
          editorialConfig: state.editorialConfig,
          featuredSeriesConfig: state.featuredSeriesConfig,
            genreBentoConfig: state.genreBentoConfig,
          tickerConfig: state.tickerConfig,
        boxSetsConfig: state.boxSetsConfig,
        trendingConfig: state.trendingConfig,
          newReleasesConfig: state.newReleasesConfig,
          mangaDiscoveryConfig: state.mangaDiscoveryConfig,
          shopShowcaseConfig: state.shopShowcaseConfig,
          shopShowcaseArabicConfig: state.shopShowcaseArabicConfig,
          heroArabicContent: state.heroArabicContent,
          announcementArabic: state.announcementArabic,
          shippingArabicConfig: state.shippingArabicConfig,
          editorialArabicConfig: state.editorialArabicConfig,
          newReleasesArabicConfig: state.newReleasesArabicConfig,
          mangaDiscoveryArabicConfig: state.mangaDiscoveryArabicConfig,
          tickerArabicConfig: state.tickerArabicConfig,
        boxSetsArabicConfig: state.boxSetsArabicConfig,
        trendingArabicConfig: state.trendingArabicConfig,
          genreBentoArabicConfig: state.genreBentoArabicConfig,
          policyContent: state.policyContent,
          policyContentArabic: state.policyContentArabic,
        };
        return JSON.stringify(exportPayload, null, 2);
      },

      importData: (jsonStr) => {
        try {
          const parsed = JSON.parse(jsonStr);
          if (!parsed || !Array.isArray(parsed.volumes)) {
            return false;
          }

          const importedVolumes = parsed.volumes || ALL_VOLUMES;
          set({
            volumes: importedVolumes,
            // An exported file may predate this and carry nested copies; the
            // catalogue it came with decides, not whatever was nested.
            series: withDerivedSeriesVolumes(parsed.series || ALL_SERIES, importedVolumes),
            genres: parsed.genres || GENRES,
            formats: parsed.formats || DEFAULT_FORMATS,
            heroContent: { ...DEFAULT_HERO_CONTENT, ...(parsed.heroContent || {}) },
            announcement: { ...DEFAULT_ANNOUNCEMENT, ...(parsed.announcement || {}) },
            shippingConfig: {
              ...DEFAULT_SHIPPING_CONFIG,
              ...(parsed.shippingConfig || {}),
              governoratesList:
                Array.isArray(parsed.shippingConfig?.governoratesList) &&
                parsed.shippingConfig.governoratesList.length > 0
                  ? parsed.shippingConfig.governoratesList
                  : EGYPT_GOVERNORATES,
              governorateRates: {
                ...DEFAULT_GOVERNORATE_RATES,
                ...(parsed.shippingConfig?.governorateRates || {}),
              },
            },
            editorialConfig: { ...DEFAULT_EDITORIAL, ...(parsed.editorialConfig || {}) },
            featuredSeriesConfig: { ...DEFAULT_FEATURED_SERIES, ...(parsed.featuredSeriesConfig || {}) },
            genreBentoConfig: { ...DEFAULT_GENRE_BENTO, ...(parsed.genreBentoConfig || {}) },
            tickerConfig: { ...DEFAULT_TICKER_CONFIG, ...(parsed.tickerConfig || {}) },
            boxSetsConfig: { ...DEFAULT_BOX_SETS_CONFIG, ...(parsed.boxSetsConfig || {}) },
            trendingConfig: { ...DEFAULT_TRENDING_CONFIG, ...(parsed.trendingConfig || {}) },
            newReleasesConfig: { ...DEFAULT_NEW_RELEASES_CONFIG, ...(parsed.newReleasesConfig || {}) },
            mangaDiscoveryConfig: { ...DEFAULT_MANGA_DISCOVERY_CONFIG, ...(parsed.mangaDiscoveryConfig || {}) },
            shopShowcaseConfig: { ...DEFAULT_SHOP_SHOWCASE_CONFIG, ...(parsed.shopShowcaseConfig || {}) },
            shopShowcaseArabicConfig: { ...DEFAULT_SHOP_SHOWCASE_ARABIC_CONFIG, ...(parsed.shopShowcaseArabicConfig || {}) },
            heroArabicContent: { ...DEFAULT_HERO_ARABIC_CONTENT, ...(parsed.heroArabicContent || {}) },
            announcementArabic: { ...DEFAULT_ANNOUNCEMENT_ARABIC, ...(parsed.announcementArabic || {}) },
            shippingArabicConfig: { ...DEFAULT_SHIPPING_ARABIC_CONFIG, ...(parsed.shippingArabicConfig || {}) },
            editorialArabicConfig: { ...DEFAULT_EDITORIAL_ARABIC, ...(parsed.editorialArabicConfig || {}) },
            newReleasesArabicConfig: { ...DEFAULT_NEW_RELEASES_ARABIC_CONFIG, ...(parsed.newReleasesArabicConfig || {}) },
            mangaDiscoveryArabicConfig: { ...DEFAULT_MANGA_DISCOVERY_ARABIC_CONFIG, ...(parsed.mangaDiscoveryArabicConfig || {}) },
            tickerArabicConfig: { ...DEFAULT_TICKER_ARABIC_CONFIG, ...(parsed.tickerArabicConfig || {}) },
            boxSetsArabicConfig: { ...DEFAULT_BOX_SETS_ARABIC_CONFIG, ...(parsed.boxSetsArabicConfig || {}) },
            trendingArabicConfig: { ...DEFAULT_TRENDING_ARABIC_CONFIG, ...(parsed.trendingArabicConfig || {}) },
            genreBentoArabicConfig: { ...DEFAULT_GENRE_BENTO_ARABIC_CONFIG, ...(parsed.genreBentoArabicConfig || {}) },
            policyContent: { ...DEFAULT_POLICY_CONTENT, ...(parsed.policyContent || {}) },
            policyContentArabic: { ...DEFAULT_POLICY_CONTENT_ARABIC, ...(parsed.policyContentArabic || {}) },
          });
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: "kairo_storefront_cms_v3",
      // Storefront business data is loaded from Neon by StorefrontDataSync.
      // This no-op storage prevents CMS/catalogue data from being written locally.
      storage: createJSONStorage(() => ({
        getItem: () => null,
        setItem: () => undefined,
        removeItem: () => undefined,
      })),
      partialize: (state) => ({
        volumes: state.volumes,
        series: state.series,
        genres: state.genres,
        heroContent: state.heroContent,
        announcement: state.announcement,
        shippingConfig: state.shippingConfig,
        editorialConfig: state.editorialConfig,
        featuredSeriesConfig: state.featuredSeriesConfig,
        genreBentoConfig: state.genreBentoConfig,
        tickerConfig: state.tickerConfig,
        boxSetsConfig: state.boxSetsConfig,
        trendingConfig: state.trendingConfig,
        newReleasesConfig: state.newReleasesConfig,
        mangaDiscoveryConfig: state.mangaDiscoveryConfig,
        shopShowcaseConfig: state.shopShowcaseConfig,
        shopShowcaseArabicConfig: state.shopShowcaseArabicConfig,
        heroArabicContent: state.heroArabicContent,
        announcementArabic: state.announcementArabic,
        shippingArabicConfig: state.shippingArabicConfig,
        editorialArabicConfig: state.editorialArabicConfig,
        newReleasesArabicConfig: state.newReleasesArabicConfig,
        mangaDiscoveryArabicConfig: state.mangaDiscoveryArabicConfig,
        tickerArabicConfig: state.tickerArabicConfig,
        boxSetsArabicConfig: state.boxSetsArabicConfig,
        trendingArabicConfig: state.trendingArabicConfig,
        genreBentoArabicConfig: state.genreBentoArabicConfig,
        policyContent: state.policyContent,
        policyContentArabic: state.policyContentArabic,
      }),
      merge: (persistedState: unknown, currentState: StorefrontState): StorefrontState => {
        const persisted = persistedState as Partial<StorefrontState> | undefined;
        const merged: StorefrontState = { ...currentState, ...(persisted || {}) };
        if (persisted?.heroArabicContent) {
          merged.heroArabicContent = { ...DEFAULT_HERO_ARABIC_CONTENT, ...persisted.heroArabicContent };
        } else {
          merged.heroArabicContent = DEFAULT_HERO_ARABIC_CONTENT;
        }
        if (persisted?.announcementArabic) {
          merged.announcementArabic = { ...DEFAULT_ANNOUNCEMENT_ARABIC, ...persisted.announcementArabic };
        } else {
          merged.announcementArabic = DEFAULT_ANNOUNCEMENT_ARABIC;
        }
        if (persisted?.shippingArabicConfig) {
          merged.shippingArabicConfig = { ...DEFAULT_SHIPPING_ARABIC_CONFIG, ...persisted.shippingArabicConfig };
        } else {
          merged.shippingArabicConfig = DEFAULT_SHIPPING_ARABIC_CONFIG;
        }
        if (persisted?.editorialArabicConfig) {
          merged.editorialArabicConfig = { ...DEFAULT_EDITORIAL_ARABIC, ...persisted.editorialArabicConfig };
        } else {
          merged.editorialArabicConfig = DEFAULT_EDITORIAL_ARABIC;
        }
        if (persisted?.newReleasesArabicConfig) {
          merged.newReleasesArabicConfig = { ...DEFAULT_NEW_RELEASES_ARABIC_CONFIG, ...persisted.newReleasesArabicConfig };
        } else {
          merged.newReleasesArabicConfig = DEFAULT_NEW_RELEASES_ARABIC_CONFIG;
        }
        if (persisted?.mangaDiscoveryArabicConfig) {
          merged.mangaDiscoveryArabicConfig = { ...DEFAULT_MANGA_DISCOVERY_ARABIC_CONFIG, ...persisted.mangaDiscoveryArabicConfig };
        } else {
          merged.mangaDiscoveryArabicConfig = DEFAULT_MANGA_DISCOVERY_ARABIC_CONFIG;
        }
        if (persisted?.trendingArabicConfig) {
          merged.trendingArabicConfig = { ...DEFAULT_TRENDING_ARABIC_CONFIG, ...persisted.trendingArabicConfig };
        } else {
          merged.trendingArabicConfig = DEFAULT_TRENDING_ARABIC_CONFIG;
        }
        if (persisted?.genreBentoArabicConfig) {
          merged.genreBentoArabicConfig = { ...DEFAULT_GENRE_BENTO_ARABIC_CONFIG, ...persisted.genreBentoArabicConfig };
        } else {
          merged.genreBentoArabicConfig = DEFAULT_GENRE_BENTO_ARABIC_CONFIG;
        }
        merged.policyContent = { ...DEFAULT_POLICY_CONTENT, ...(persisted?.policyContent || {}) };
        merged.policyContentArabic = {
          ...DEFAULT_POLICY_CONTENT_ARABIC,
          ...(persisted?.policyContentArabic || {}),
        };
        if (persisted?.trendingConfig) {
          merged.trendingConfig = { ...DEFAULT_TRENDING_CONFIG, ...persisted.trendingConfig };
        }
        if (persisted?.newReleasesConfig) {
          merged.newReleasesConfig = { ...DEFAULT_NEW_RELEASES_CONFIG, ...persisted.newReleasesConfig };
        }
        if (persisted?.mangaDiscoveryConfig) {
          merged.mangaDiscoveryConfig = { ...DEFAULT_MANGA_DISCOVERY_CONFIG, ...persisted.mangaDiscoveryConfig };
        }
        if (persisted?.genreBentoConfig) {
          const desc =
            persisted.genreBentoConfig.description ===
            "Navigate through 9 core canonical categories with specialized curated reading lists."
              ? DEFAULT_GENRE_BENTO.description
              : persisted.genreBentoConfig.description;
          merged.genreBentoConfig = {
            ...DEFAULT_GENRE_BENTO,
            ...persisted.genreBentoConfig,
            description: desc,
          };
        }
        if (persisted?.shippingConfig) {
          merged.shippingConfig = {
            ...DEFAULT_SHIPPING_CONFIG,
            ...persisted.shippingConfig,
            freeShippingEnabled:
              persisted.shippingConfig.freeShippingEnabled ??
              DEFAULT_SHIPPING_CONFIG.freeShippingEnabled,
            freeShippingThreshold:
              persisted.shippingConfig.freeShippingThreshold ??
              DEFAULT_SHIPPING_CONFIG.freeShippingThreshold,
            perk1Title: persisted.shippingConfig.perk1Title || DEFAULT_SHIPPING_CONFIG.perk1Title,
            perk1Desc: persisted.shippingConfig.perk1Desc || DEFAULT_SHIPPING_CONFIG.perk1Desc,
            perk2Title: persisted.shippingConfig.perk2Title || DEFAULT_SHIPPING_CONFIG.perk2Title,
            perk2Desc: persisted.shippingConfig.perk2Desc || DEFAULT_SHIPPING_CONFIG.perk2Desc,
            perk3Title: persisted.shippingConfig.perk3Title || DEFAULT_SHIPPING_CONFIG.perk3Title,
            perk3Desc: persisted.shippingConfig.perk3Desc || DEFAULT_SHIPPING_CONFIG.perk3Desc,
            governoratesList:
              Array.isArray(persisted.shippingConfig.governoratesList) &&
              persisted.shippingConfig.governoratesList.length > 0
                ? persisted.shippingConfig.governoratesList
                : EGYPT_GOVERNORATES,
            governorateRates: {
              ...DEFAULT_GOVERNORATE_RATES,
              ...(persisted.shippingConfig.governorateRates || {}),
            },
          };
        }
        if (persisted?.editorialConfig) {
          merged.editorialConfig = {
            ...DEFAULT_EDITORIAL,
            ...persisted.editorialConfig,
            footerDescription:
              persisted.editorialConfig.footerDescription ||
              DEFAULT_EDITORIAL.footerDescription,
            hubCities:
              persisted.editorialConfig.hubCities ||
              DEFAULT_EDITORIAL.hubCities,
          };
        }
        return merged;
      },
    }
  )
);

export function getActiveGovernorates(shippingConfig?: ShippingConfig | null): EgyptGovernorate[] {
  if (
    shippingConfig?.governoratesList &&
    Array.isArray(shippingConfig.governoratesList) &&
    shippingConfig.governoratesList.length > 0
  ) {
    return shippingConfig.governoratesList;
  }
  return EGYPT_GOVERNORATES;
}

/**
 * Seeds the store with the catalogue the server read out of the database, so
 * the first paint is already correct.
 *
 * The store lives at module scope, which on the server means it is shared by
 * every request being rendered in that process. That is safe here only because
 * everything it seeds is global shop data — the catalogue, the section copy,
 * the shipping rules — with nothing belonging to a particular visitor, and
 * every request within a revalidation window is handed the same snapshot. It
 * is re-seeded on every server render rather than once, or the first request a
 * process ever served would pin its catalogue for every request after it.
 */
let seededInBrowser = false;

/**
 * The section defaults as the code declares them, captured before anything
 * seeds over them. `getInitialState()` is written into on every seed, so it
 * stops being a record of the defaults after the first one.
 */
const PRISTINE_DEFAULTS: Record<string, unknown> = { ...useStorefrontStore.getInitialState() };

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function seedStorefrontFromServer(data: Record<string, unknown> | null | undefined): void {
  if (!data || typeof data !== "object") return;

  // The server sends series without their volume lists; rebuild them from the
  // catalogue so `series.volumes` is there for the console, always agreeing
  // with the flat list it was derived from.
  if (Array.isArray((data as { series?: unknown }).series)) {
    data = {
      ...data,
      series: withDerivedSeriesVolumes(
        (data as { series?: unknown }).series,
        (data as { volumes?: unknown }).volumes ?? useStorefrontStore.getState().volumes
      ),
    };
  }

  // A config section stored in the database is a snapshot of the fields that
  // existed the day a curator last saved it. Assigning it straight over the
  // defaults means any field added to the code since then arrives `undefined`
  // — the storefront falls back to its hard-coded copy and looks fine, while
  // the console shows the curator an empty box for text that is plainly on the
  // page. Laying each section over its default fills those gaps; anything the
  // database does hold, including a deliberately blanked string, still wins.
  // Lists (the catalogue, the genres) are replaced outright, as they should be.
  data = Object.fromEntries(
    Object.entries(data).map(([key, value]) =>
      isPlainObject(value) && isPlainObject(PRISTINE_DEFAULTS[key])
        ? [key, { ...PRISTINE_DEFAULTS[key], ...value }]
        : [key, value]
    )
  );

  // zustand renders the server pass — and the browser's hydration pass — from
  // `getInitialState()`, a snapshot taken when this module was first evaluated.
  // `setState` moves `getState` and leaves that snapshot untouched, so on its
  // own it changes nothing about the markup: the page would still be built from
  // the catalogue compiled into the bundle. Writing into the object
  // `getInitialState` hands back moves both, and moving both is what keeps the
  // server's HTML and the client's first render identical.
  // `catalogLoaded` rides along: the server handed us the whole catalogue, so
  // there is nothing left to wait for and a genuinely missing product should
  // say so straight away instead of sitting on a spinner.
  Object.assign(useStorefrontStore.getInitialState(), data, { catalogLoaded: true });

  if (typeof window === "undefined") {
    useStorefrontStore.setState(data as Partial<StorefrontState>);
    return;
  }

  // In the browser the fetch in StorefrontDataSync owns the store from here on;
  // re-seeding would undo a curator's unsaved edits on every re-render.
  if (seededInBrowser) return;
  seededInBrowser = true;

  // Written into the live state object rather than pushed through `setState`.
  // This runs inside the render of the outermost client component, so nothing
  // below has read the store yet and every component still to render picks the
  // new values up on its first pass — while `setState` here would notify
  // whatever React had already mounted and schedule an update from inside a
  // render, which React rightly complains about.
  Object.assign(useStorefrontStore.getState(), data, { catalogLoaded: true });
}

/** True once the server handed us a catalogue, so the client can skip its own fetch. */
export function wasSeededFromServer(): boolean {
  return seededInBrowser;
}
