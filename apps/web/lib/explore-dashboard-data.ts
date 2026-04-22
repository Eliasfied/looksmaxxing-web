/**
 * TODO: Replace this with your own dashboard/explore tile definitions.
 * This file is intentionally left empty for the SaaS template.
 * See the original Banana AI implementation for a full example.
 */

export type ExploreTileDef = {
  image: string
  requiredImages?: 1 | 2
  prompt?: string
}

export type FeaturedPageDef = {
  hero: ExploreTileDef
  grid: [ExploreTileDef, ExploreTileDef, ExploreTileDef, ExploreTileDef]
}

export type ExploreSectionDef =
  | {
      layout: 'featured'
      title: string
      badge?: string
      pages: FeaturedPageDef[]
    }
  | {
      layout: 'row3'
      title: string
      tiles: [ExploreTileDef, ExploreTileDef, ExploreTileDef]
    }
  | {
      layout: 'fourLarge'
      title: string
      tiles: [ExploreTileDef, ExploreTileDef, ExploreTileDef, ExploreTileDef]
    }
  | {
      layout: 'grid'
      title: string
      badge?: string
      tiles: ExploreTileDef[]
      stripSize?: 'default' | 'large'
    }

// TODO: Add your own explore sections here
export const EXPLORE_SECTIONS: ExploreSectionDef[] = []
