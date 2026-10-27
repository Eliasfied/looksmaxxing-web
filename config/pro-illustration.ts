// Line-art "scan" portrait for the Aura Pro try-on illustration, shared by the
// app and the marketing site. Deliberately abstract: no real face, no implied
// before/after result of an actual person.

const MESH: Array<[number, number]> = [
  [78, 112], [92, 108], [108, 108], [122, 112], // eyes
  [100, 128], [100, 140], // nose
  [86, 156], [114, 156], [100, 160], // mouth
  [64, 118], [136, 118], [70, 150], [130, 150], [84, 178], [116, 178], [100, 186] // jaw and cheeks
]
const LINKS: Array<[number, number]> = [
  [0, 1], [2, 3], [1, 4], [2, 4], [4, 5], [5, 6], [5, 7], [6, 8], [7, 8],
  [9, 11], [11, 13], [13, 15], [15, 14], [14, 12], [12, 10], [0, 9], [3, 10], [6, 13], [7, 14]
]

const HAIR = {
  long: 'M52 120 Q46 44 100 40 Q156 44 148 120 Q150 160 138 186 L134 128 Q130 84 100 78 Q70 84 66 128 L62 186 Q50 160 52 120 Z',
  crop: 'M58 106 Q58 50 100 46 Q142 50 142 106 Q136 78 118 72 Q124 60 106 62 Q98 52 86 62 Q66 70 58 106 Z'
} as const

export function scanPortrait(hair: keyof typeof HAIR, id: string) {
  const dots = MESH.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="#f0abfc"/>`).join('')
  const lines = LINKS.map(([a, b]) => `<line x1="${MESH[a][0]}" y1="${MESH[a][1]}" x2="${MESH[b][0]}" y2="${MESH[b][1]}"/>`).join('')
  const hairFill = hair === 'long' ? `url(#${id}-hl)` : `url(#${id}-hc)`
  return `<svg viewBox="0 0 200 240" class="h-full w-full" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
<defs>
<radialGradient id="${id}-bg" cx="50%" cy="38%" r="75%"><stop offset="0%" stop-color="#2a1a3f"/><stop offset="100%" stop-color="#0c0a12"/></radialGradient>
<linearGradient id="${id}-face" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2b2340"/><stop offset="100%" stop-color="#1a1428"/></linearGradient>
<linearGradient id="${id}-hl" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#a78bfa"/><stop offset="100%" stop-color="#5b21b6"/></linearGradient>
<linearGradient id="${id}-hc" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f0abfc"/><stop offset="100%" stop-color="#c026d3"/></linearGradient>
</defs>
<rect width="200" height="240" fill="url(#${id}-bg)"/>
<g stroke="rgba(255,255,255,0.06)">${[40, 80, 120, 160, 200].map((y) => `<line x1="0" x2="200" y1="${y}" y2="${y}"/>`).join('')}</g>
<path d="M40 240 Q48 200 100 196 Q152 200 160 240 Z" fill="#1a1428" stroke="rgba(255,255,255,0.18)"/>
<path d="M86 184 L86 200 M114 184 L114 200" stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/>
<ellipse cx="100" cy="128" rx="40" ry="60" fill="url(#${id}-face)" stroke="rgba(255,255,255,0.35)" stroke-width="1.5"/>
<g stroke="rgba(240,171,252,0.35)" stroke-width="0.8">${lines}</g>
${dots}
<path d="${HAIR[hair]}" fill="${hairFill}" opacity="0.92"/>
<path d="${HAIR[hair]}" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1"/>
</svg>`
}
