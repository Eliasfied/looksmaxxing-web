// User & Credits
export interface User {
  id: string
  email: string
  createdAt: string
}

export interface Credits {
  userId: string
  subscriptionCredits: number
  topupCredits: number
  totalCredits: number
  updatedAt: string
}

// Image Generation
export type ImageSize = '512x512' | '768x768' | '1024x1024' | '1024x1792' | '1792x1024'

export interface GenerateImageParams {
  prompt: string
  size?: ImageSize
  numImages?: number
}

export interface GeneratedImage {
  id: string
  url: string
  prompt: string
  size: ImageSize
  createdAt: string
  userId: string
}

// Explore Packs (pSEO pages)
export interface Pack {
  slug: string
  h1: string
  badge: string | null
  emoji: string
  category: string
  subtitle: string
  stat: string
  intro: string
  long_description: string
  hero_title: string
  hero_noun: string
  cta_headline: string
  meta_title: string
  meta_description: string
  example_images: { src: string; alt: string }[]
  testimonials: { stars: number; text: string; author: string; verified: boolean }[]
  related: string[]
  // Web app pack fields
  prompts_male: string[]
  prompts_female: string[]
  input_guidance: string
  recommended_model: string
  target_gender: 'male' | 'female' | 'mixed'
}

// Payments
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'trial'

export interface Subscription {
  userId: string
  status: SubscriptionStatus
  productId: string
  expiresAt: string | null
}
