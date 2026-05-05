export const appConfig = {
  brand: {
    name: "Aura: Looksmaxxing",
    shortName: "Aura",
    domain: "aura-looksmaxxing.com",
    appUrl: "https://app.aura-looksmaxxing.com",
    marketingUrl: "https://aura-looksmaxxing.com",
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
      { id: "aura_monthly", name: "Monthly", price: 9.99, credits: 50, interval: "monthly", rcProductId: "aura_monthly" },
      { id: "aura_yearly", name: "Yearly", price: 49.99, credits: 50, interval: "yearly", rcProductId: "aura_yearly" },
    ] as Array<{
      id: string;
      name: string;
      price: number;
      credits: number;
      interval: "monthly" | "yearly";
      rcProductId: string;
    }>,
    creditPacks: [] as Array<{
      id: string;
      credits: number;
      price: number;
      rcProductId: string;
    }>,
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
