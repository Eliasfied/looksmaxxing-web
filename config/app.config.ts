export const appConfig = {
  brand: {
    name: "Aura: Looksmaxxing",
    shortName: "Aura",
    domain: "aura-looksmaxxing.com",
    appUrl: "https://app.aura-looksmaxxing.com",
    marketingUrl: "https://www.aura-looksmaxxing.com",
    supportEmail: "support@aura-looksmaxxing.com",
  },

  seo: {
    defaultTitle: "Aura: Looksmaxxing – AI Face Analysis & Glow-Up Coach",
    defaultDescription: "Get your PSL score, try hairstyles, build a glow-up routine, and chat with your AI looksmaxxing coach.",
    ogImage: "/og-default.png",
    twitterHandle: "@looksmaxxingai",
  },

  theme: {
    primaryColor: "#000000",
    fontFamily: "Inter",
  },

  pricing: {
    plans: [
      { id: "aura_monthly", name: "Monthly", price: 9.99, credits: 100, interval: "monthly", rcProductId: "aura_monthly" },
      { id: "aura_yearly", name: "Yearly", price: 49.99, credits: 100, interval: "yearly", rcProductId: "aura_yearly" },
    ] as Array<{
      id: string;
      name: string;
      price: number;
      credits: number;
      interval: "monthly" | "yearly";
      rcProductId: string;
    }>,
    // Legacy one-off pack: no longer sold, but old purchases still arrive via
    // the RevenueCat webhook and existing top-up credits stay spendable.
    creditPacks: [] as Array<{
      id: string;
      name: string;
      credits: number;
      price: number;
      rcProductId: string;
    }>,
  },

  // Aura Pro: AI analyses are unlimited under a daily fair-use cap; only
  // generated images draw on the monthly credit allowance (100 credits).
  pro: {
    dailyAnalyses: 10,
    freeCoachMessages: 3,
  },

  credits: {
    signupBonus: 0,
    scan: 3,
    unlockScan: 3,
    toolReport: 5,
    haircutTryOn: 2,
    tryOn: 2,
  },

  aiModels: [] as Array<{
    id: string;
    name: string;
    provider: string;
    creditCost: number;
  }>,

  features: {
    hasCredits: true,
    hasSubscriptions: true,
    hasTopups: true,
    hasPseoAutomation: false,
  },

  pseo: {
    toolDescription: "AI looksmaxxing photo transformer",
    targetAudience: "people who want to improve their appearance with AI",
    promptTemplate: "config/pseo.prompt.txt",
  },
} as const;

export type AppConfig = typeof appConfig;
