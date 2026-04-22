export const appConfig = {
  brand: {
    name: "YourApp",
    shortName: "YA",
    domain: "yourapp.com",
    appUrl: "https://app.yourapp.com",
    marketingUrl: "https://yourapp.com",
    supportEmail: "support@yourapp.com",
  },

  seo: {
    defaultTitle: "YourApp - AI Photo Generator",
    defaultDescription: "Generate stunning AI photos with YourApp.",
    ogImage: "/og-default.png",
    twitterHandle: "@yourapp",
  },

  theme: {
    primaryColor: "#000000",
    fontFamily: "Inter",
  },

  pricing: {
    plans: [
      // { id: "starter_monthly", name: "Starter", price: 19, credits: 2000, interval: "monthly", rcProductId: "yourapp_starter_monthly" },
      // { id: "pro_monthly",     name: "Pro",     price: 49, credits: 8000, interval: "monthly", rcProductId: "yourapp_pro_monthly" },
      // { id: "ultra_monthly",   name: "Ultra",   price: 99, credits: 20000, interval: "monthly", rcProductId: "yourapp_ultra_monthly" },
    ] as Array<{
      id: string;
      name: string;
      price: number;
      credits: number;
      interval: "monthly" | "yearly";
      rcProductId: string;
    }>,
    creditPacks: [
      // { id: "credits_2000", credits: 2000, price: 29.99, rcProductId: "yourapp_credits_2000" },
      // { id: "credits_6000", credits: 6000, price: 49.99, rcProductId: "yourapp_credits_6000" },
    ] as Array<{
      id: string;
      credits: number;
      price: number;
      rcProductId: string;
    }>,
  },

  aiModels: [
    // { id: "model-id", name: "Model Name", provider: "fal.ai", creditCost: 40 },
  ] as Array<{
    id: string;
    name: string;
    provider: string;
    creditCost: number;
  }>,

  features: {
    hasCredits: true,
    hasSubscriptions: true,
    hasTopups: true,
    hasPseoAutomation: true,
  },

  pseo: {
    toolDescription: "AI photo generator",
    targetAudience: "people who want AI-generated photos",
    promptTemplate: "config/pseo.prompt.txt",
  },
} as const;

export type AppConfig = typeof appConfig;
