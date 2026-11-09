// Printed guide that ships with every 30-day plan PDF, one version for men and
// one for women. The plan itself is personal; this is the reference around it:
// how to brief a barber or salon, grooming basics, honest notes on the face.
// Keep it free of procedures, medication and promises about bone structure.

export interface GuideSection {
  title: string
  intro: string
  points: string[]
}

export interface Guide {
  title: string
  subtitle: string
  sections: GuideSection[]
}

const PHOTOS: GuideSection = {
  title: 'Progress photos that are comparable',
  intro: 'A change you cannot see in a fair comparison did not happen, and one you can see is motivating. Same setup every time:',
  points: [
    'Same spot, facing a window, daylight, no ceiling light.',
    'Phone at eye height, arm’s length or a timer, no wide-angle selfie close-up.',
    'Front, left side, right side. Neutral face, hair off the forehead.',
    'No filter, no beauty mode. Days 1, 7, 14, 21 and 30.'
  ]
}

const SAFETY: GuideSection = {
  title: 'When to see a professional',
  intro: 'Some things a routine cannot fix, and that is fine. Book a dermatologist or doctor if:',
  points: [
    'Breakouts are painful, deep, leave scars or do not improve after 8–12 weeks.',
    'Hair is shedding noticeably or thinning quickly.',
    'A product burns, swells or leaves a rash: stop it and get it checked.',
    'You feel low about your appearance most days. Talking to someone helps more than another product.'
  ]
}

export const GUIDES: Record<'men' | 'women', Guide> = {
  men: {
    title: 'The men’s glow-up guide',
    subtitle: 'Reference pages for your 30 days: barber, beard, skin, jawline and the small details people notice.',
    sections: [
      {
        title: 'Briefing your barber',
        intro: 'Most bad haircuts are bad briefs. Bring this:',
        points: [
          'Two or three photos of the cut on someone with your hair type, plus one photo of what you do NOT want.',
          'Say the side length in clipper numbers (e.g. “a 2 on the sides, faded into a 4”) and the top in centimetres or finger-lengths.',
          'Ask “how will this grow out in four weeks?” and “how do I style it in two minutes?”.',
          'Trim every 3–4 weeks for short cuts, 6–8 weeks for longer ones. Book the next one before you leave.'
        ]
      },
      {
        title: 'Beard and stubble',
        intro: 'Clean lines make any beard length look intentional.',
        points: [
          'Neckline: about two fingers above the Adam’s apple, curving up to just behind the jaw corners. Shave everything below.',
          'Cheek line: follow your natural line or straighten it slightly. Never trim it lower than it grows.',
          'Patchy? Keep it at stubble length (1–3 mm) or clean shaven. Both look better than long and uneven.',
          'Shaving: shave after a warm shower, with the grain, sharp blade, no pressing. Fragrance-free moisturizer after.'
        ]
      },
      {
        title: 'Skin, the short version',
        intro: 'Three products done every day beat ten done sometimes.',
        points: [
          'Morning: cleanser (or water), moisturizer, SPF 30–50. SPF is the step that changes the most over time.',
          'Evening: cleanser, then your treatment step from the plan, then moisturizer.',
          'Start one new active at a time, 2–3 evenings a week, and wait two weeks before adding the next.',
          'Change pillowcases twice a week and keep your phone screen clean if you break out on the cheeks.'
        ]
      },
      {
        title: 'Jawline: what actually works',
        intro: 'Bone structure stays the same. What you can change in 30 days is everything around it:',
        points: [
          'Less bloating: steady salt intake, enough water, less alcohol, and sleep. The face looks sharper after a good week.',
          'Body fat: a small, steady deficit if you have some to lose. It shows in the face first, but slowly.',
          'Posture: chin level, neck long, shoulders back. Phone at eye height. This changes photos immediately.',
          'Framing: a beard shaped along the jaw and shorter sides on the haircut make the jaw look more defined.',
          'Skip jaw gadgets and “bone” tricks. They do not change bone and some cause jaw pain.'
        ]
      },
      {
        title: 'The details people notice',
        intro: 'Five minutes a week, and they matter more than they should.',
        points: [
          'Brows: remove only the hairs between the brows and the obvious strays. Do not reshape.',
          'Nose and ear hair: trim weekly. Nails short and clean.',
          'Teeth: floss daily; whitening toothpaste is enough for most people.',
          'Fragrance: one or two sprays on the neck or chest, not more.',
          'Lip balm in winter. Dry, cracked lips show in every photo.'
        ]
      },
      {
        title: 'Style quick wins',
        intro: 'Fit beats brand every time.',
        points: [
          'T-shirts and shirts: shoulder seam on your shoulder bone, sleeves ending mid-bicep.',
          'Trousers: no pooling at the ankle; a tailor hems them for a few dollars.',
          'Build around three neutrals (navy, grey, white or black) plus one color that suits your skin.',
          'Clean, simple shoes in good condition upgrade every outfit.'
        ]
      },
      PHOTOS,
      SAFETY
    ]
  },
  women: {
    title: 'The women’s glow-up guide',
    subtitle: 'Reference pages for your 30 days: salon, hair care, brows, skin, optional makeup and style.',
    sections: [
      {
        title: 'Briefing your stylist',
        intro: 'Most disappointing haircuts are briefs that left too much to guess.',
        points: [
          'Bring two or three photos of the cut on someone with your hair texture, plus one of what you do NOT want.',
          'Say where face-framing should start (cheekbone, chin, collarbone) and how much length you are willing to lose, in centimetres.',
          'Tell them how long you style your hair on a normal morning, and whether you air-dry.',
          'Trims every 8–12 weeks keep a shape; layers and fringes need 4–6 weeks.'
        ]
      },
      {
        title: 'Hair care that shows in 30 days',
        intro: 'Shine and less frizz come from less damage, not more products.',
        points: [
          'Heat protectant every time, and the lowest heat setting that works.',
          'Wavy or curly: apply leave-in and gel to soaking wet hair, scrunch, let it dry untouched, then scrunch out the cast.',
          'Low-tension hairstyles at night: loose braid or scrunchie, silk or satin pillowcase.',
          'Wash as often as your scalp needs, condition the lengths every time.'
        ]
      },
      {
        title: 'Brows',
        intro: 'Brows frame the eyes more than anything else on the face.',
        points: [
          'Follow your natural arch. Remove only the hairs clearly outside it, in daylight, one at a time.',
          'Brush up with a clear or tinted brow gel; fill only real gaps with light, hair-like strokes.',
          'Stop plucking the top line. Over-thinned brows take months to grow back.',
          'Unsure? One professional shaping, then maintain it yourself.'
        ]
      },
      {
        title: 'Skin, the short version',
        intro: 'Consistency beats a 10-step routine.',
        points: [
          'Morning: gentle cleanser (or water), moisturizer, SPF 30–50 every day, reapplied when you are outside for long.',
          'Evening: if you wore makeup or SPF, cleanse twice (oil or balm first), then your treatment step and moisturizer.',
          'One new active at a time, 2–3 evenings a week, two weeks before adding the next.',
          'Clean makeup brushes weekly and change pillowcases twice a week if you break out.'
        ]
      },
      {
        title: 'Makeup basics (optional)',
        intro: 'Entirely your choice. If you wear it, five products cover a fresh, rested look:',
        points: [
          'A light skin tint or concealer only where needed, not a full mask.',
          'Brow gel, mascara on the upper lashes, a cream blush on the cheeks.',
          'A lip tint close to your natural lip color.',
          'Everything comes off at night, every night.'
        ]
      },
      {
        title: 'Face definition: what actually works',
        intro: 'Bone structure stays the same. Around it, a month changes a lot:',
        points: [
          'Less puffiness: sleep, steady salt intake, enough water, less alcohol.',
          'Hair framing: layers or a fringe that start at the cheekbone draw the eye to the eyes and cheekbones.',
          'Posture: neck long, chin level, shoulders down and back.',
          'Skip facial gadgets that promise to reshape bone or fat. Gentle massage feels good but does not change structure.'
        ]
      },
      {
        title: 'Style quick wins',
        intro: 'Fit and color do more than trends.',
        points: [
          'Find the two or three colors that make your skin look brighter in daylight and wear them near your face.',
          'Tailoring: hems, waist and sleeve length make basics look expensive.',
          'A few pieces you love and wear often beat a full closet you avoid.',
          'Shoes and bags clean and in good shape.'
        ]
      },
      PHOTOS,
      SAFETY
    ]
  }
}
