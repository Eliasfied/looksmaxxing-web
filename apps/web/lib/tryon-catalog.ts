// Try-on options are a closed list: the server builds the prompt from the
// catalog, so nothing the client sends ends up in the image prompt verbatim.

export const FACE_SHAPES = ['Oval', 'Square', 'Round', 'Oblong', 'Heart', 'Diamond'] as const
export type FaceShape = (typeof FACE_SHAPES)[number]

export type TryOnType = 'hair' | 'color' | 'beard' | 'glasses' | 'bald'

export interface TryOnOption {
  id: string
  label: string
  /** Picture of the style, for the hairstyles we have reference images of. */
  image?: string
  shapes?: FaceShape[]
}

export interface TryOnCategory {
  type: TryOnType
  label: string
  blurb: string
  options: TryOnOption[]
}

const hairImage = (name: string) => `/images/hairstyle/${encodeURIComponent(name)}.webp`
const hair = (label: string, shapes: FaceShape[], image = true): TryOnOption => ({
  id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  label,
  shapes,
  ...(image ? { image: hairImage(label) } : {})
})
const plain = (label: string): TryOnOption => ({
  id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  label
})

export const TRYON_CATALOG: TryOnCategory[] = [
  {
    type: 'hair',
    label: 'Haircut',
    blurb: 'See a new cut on your own face before you sit in the chair.',
    options: [
      hair('Curtains', ['Oval']),
      hair('Quiff', ['Oval']),
      hair('Textured Crop', ['Oval']),
      hair('Wolf Cut', ['Oval']),
      hair('Buzz Cut', ['Square']),
      hair('Crew Cut', ['Square']),
      hair('French Crop', ['Square']),
      hair('High Fade', ['Square']),
      hair('Modern Middle Part', ['Round']),
      hair('Mid Fade', ['Round']),
      hair('Low Fade', ['Round']),
      hair('Slick Back (Natural)', ['Round']),
      hair('Man Bun', ['Oblong']),
      hair('Low Taper', ['Oblong']),
      hair('Bro Flow', ['Oblong']),
      hair('Modern Shag', ['Oblong']),
      hair('Ivy League', ['Heart']),
      hair('Classic Side Part', ['Heart']),
      hair('Pompadour', ['Heart']),
      hair('Caesar Cut', ['Heart']),
      hair('Two-Block', ['Diamond']),
      hair('Disconnected Undercut', ['Diamond']),
      hair('Modern Mullet', ['Diamond']),
      hair('Long Layers', ['Diamond']),
      hair('Curtain Bangs', ['Oval', 'Oblong', 'Heart'], false),
      hair('Long Bob', ['Round', 'Square', 'Oval'], false),
      hair('Pixie Cut', ['Oval', 'Heart', 'Diamond'], false),
      hair('Face-Framing Layers', ['Round', 'Square', 'Oblong'], false),
      hair('Blunt Bob', ['Oval', 'Oblong'], false),
      hair('Shoulder-Length Shag', ['Square', 'Diamond', 'Heart'], false)
    ]
  },
  {
    type: 'color',
    label: 'Hair color',
    blurb: 'Try a shade without the salon bill or the regret.',
    options: [
      'Platinum Blonde',
      'Honey Blonde',
      'Copper Red',
      'Chestnut Brown',
      'Jet Black',
      'Ash Brown',
      'Balayage Highlights',
      'Silver Grey'
    ].map(plain)
  },
  {
    type: 'beard',
    label: 'Beard',
    blurb: 'Find the facial hair that frames your jaw best.',
    options: [
      'Light Stubble',
      'Heavy Stubble',
      'Short Boxed Beard',
      'Full Beard',
      'Goatee',
      'Van Dyke',
      'Chevron Mustache',
      'Clean Shaven'
    ].map(plain)
  },
  {
    type: 'glasses',
    label: 'Glasses',
    blurb: 'Compare frame shapes on your face in seconds.',
    options: [
      'Round Wire Frames',
      'Rectangular Frames',
      'Thick Square Frames',
      'Browline Frames',
      'Aviator Glasses',
      'Cat-Eye Frames',
      'Rimless Glasses',
      'Classic Wayfarer Sunglasses'
    ].map(plain)
  },
  {
    type: 'bald',
    label: 'Bald preview',
    blurb: 'Curious how a shaved head would look? Check before you commit.',
    options: ['Clean Shaved Head', 'Skin Fade Buzz', 'Bald with Stubble'].map(plain)
  }
]

export function findTryOn(type: string, optionId: string) {
  const category = TRYON_CATALOG.find((c) => c.type === type)
  const option = category?.options.find((o) => o.id === optionId)
  return category && option ? { category, option } : null
}

const KEEP =
  "Keep the person's face, identity, skin tone, facial structure, expression, pose, background and lighting identical. Photorealistic, high quality portrait."

export function tryOnPrompt(type: TryOnType, label: string, faceShape?: FaceShape | null) {
  const shape = faceShape ? `, which suits a ${faceShape.toLowerCase()} face shape` : ''
  switch (type) {
    case 'hair':
      return `Change only this person's hairstyle to a ${label}${shape}. ${KEEP}`
    case 'color':
      return `Change only this person's hair color to ${label}. Keep the haircut and length the same. ${KEEP}`
    case 'beard':
      return label === 'Clean Shaven'
        ? `Remove this person's facial hair so they are clean shaven. ${KEEP}`
        : `Give this person a natural-looking ${label}${shape}, matching their hair color. ${KEEP}`
    case 'glasses':
      return `Add ${label} to this person, sized and positioned naturally on their face. ${KEEP}`
    case 'bald':
      return `Show this person with a ${label}, as if their head were shaved today. ${KEEP}`
  }
}
