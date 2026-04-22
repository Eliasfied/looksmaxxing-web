import { EXPLORE_SECTIONS } from '@/lib/explore-dashboard-data'
import { appConfig } from '@/lib/config'

/** Build a path to prompt lookup from the tile definitions at module load time. */
function buildPromptMap(): Map<string, string> {
  const map = new Map<string, string>()

  function register(imagePath: string, prompt: string | undefined) {
    if (!prompt) return
    const parts = imagePath.replace(/\\/g, '/').split('/')
    const basename = (parts[parts.length - 1] ?? '').replace(/\.[^.]+$/, '')
    const folder = parts[parts.length - 2] ?? ''
    const key = `${folder}/${basename}`
    if (!map.has(key)) map.set(key, prompt)
  }

  for (const section of EXPLORE_SECTIONS) {
    if (section.layout === 'featured') {
      for (const page of section.pages) {
        register(page.hero.image, page.hero.prompt)
        for (const t of page.grid) register(t.image, t.prompt)
      }
    } else {
      for (const t of section.tiles) register(t.image, t.prompt)
    }
  }

  return map
}

const PROMPT_MAP = buildPromptMap()

/**
 * Derive the tile key from a dashboard image path.
 */
export function tileKeyFromPath(imagePath: string): string {
  const parts = imagePath.replace(/\\/g, '/').split('/')
  const basename = (parts[parts.length - 1] ?? '').replace(/\.[^.]+$/, '')
  const folder = parts[parts.length - 2] ?? ''
  return `${folder}/${basename}`
}

/**
 * Returns the prompt for a given tile key (folder/basename).
 * Falls back to a generic style-transfer prompt using appConfig.pseo.toolDescription.
 */
export function buildExplorePrompt(tileKey: string): string {
  const prompt = PROMPT_MAP.get(tileKey)
  if (prompt) return prompt

  const label = tileKey
    .split('/')
    .pop()
    ?.split(/_+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ') ?? tileKey

  return `Transform this image using the "${label}" style with ${appConfig.pseo.toolDescription}: natural pose and expression preserved, professional quality, cohesive lighting, sharp focus, high resolution.`
}
