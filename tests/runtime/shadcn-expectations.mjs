// Frozen nearest-8-bit foundation table generated from the Sass emitter.
// The source-profile test independently checks pinned HSL/OKLCH conversion;
// contrast tests independently check corrected text and 50%-painted focus rings.
export const expectationSlots = [
  'shadcn-background', 'shadcn-card', 'color-primary', 'color-secondary',
  'text-muted', 'stroke-strong', 'fg-negative', 'fg-positive', 'fg-warning',
  'fg-info', 'text-on-negative',
]
export const expectations = [
  ['neutral-light', 'ffffff', 'ffffff', '171717', 'f5f5f5', '686868', '222222', 'd40000', '166534', '92400e', '1d4ed8', 'ffffff'],
  ['neutral-dark', '0a0a0a', '171717', 'e5e5e5', '262626', 'a1a1a1', 'bdbdbd', 'ff6467', '4ade80', 'fbbf24', '93c5fd', '18181b'],
  ['gray-light', 'ffffff', 'ffffff', '111827', 'f3f4f6', '626976', '030712', 'cd1b27', '166534', '92400e', '1d4ed8', '18181b'],
  ['gray-dark', '030712', '030712', 'f9fafb', '1f2937', '9ca3af', 'd1d5db', 'd97068', '4ade80', 'fbbf24', '93c5fd', 'ffffff'],
  ['zinc-light', 'ffffff', 'ffffff', '18181b', 'f4f4f5', '676772', '222129', 'd40000', '166534', '92400e', '1d4ed8', 'ffffff'],
  ['zinc-dark', '09090b', '18181b', 'e4e4e7', '27272a', '9f9fa9', 'bdbdc8', 'ff6467', '4ade80', 'fbbf24', '93c5fd', '18181b'],
  ['stone-light', 'ffffff', 'ffffff', '1c1917', 'f5f5f4', '6f6762', '26211e', 'd40000', '166534', '92400e', '1d4ed8', 'ffffff'],
  ['stone-dark', '0c0a09', '1c1917', 'e7e5e4', '292524', 'a6a09b', 'c6bdb7', 'ff6467', '4ade80', 'fbbf24', '93c5fd', '18181b'],
  ['slate-light', 'ffffff', 'ffffff', '0f172a', 'f1f5f9', '5a6980', '020817', 'cd1b27', '166534', '92400e', '1d4ed8', '18181b'],
  ['slate-dark', '020817', '020817', 'f8fafc', '1e293b', '94a3b8', 'cbd5e1', 'd97068', '4ade80', 'fbbf24', '93c5fd', 'ffffff'],
]

// Frozen actual state fills. Passing 90%/80% starts are untouched; failing ones
// are the first quantized OKLCH-L step verified independently with Color.js.
export const stateExpectationSlots = ['primary', 'secondary', 'accent', 'positive', 'negative', 'warning', 'info']
  .flatMap((role) => [`color-${role}-hover`, `color-${role}-pressed`])
export const stateExpectations = [
  ['neutral-light','2e2e2e','454545','f6f6f6','f7f7f7','f6f6f6','f7f7f7','26874c','2f8652','e91923','e32835','f6a823','f7b13c','386fea','4171dc'],
  ['neutral-dark','d0d0d0','bcbcbc','252525','232323','252525','232323','21b457','20a250','e85c5f','d4585a','df910c','c9830d','5997e3','5189cd'],
  ['gray-light','292f3d','414652','f4f5f7','f5f6f8','f4f5f7','f5f6f8','26874c','2f8652','f15757','f26969','f6a823','f7b13c','386fea','4171dc'],
  ['gray-dark','e0e2e4','c8c9cc','1c2633','192230','1c2633','192230','1fb256','1c9f4f','731b1c','66191b','dd8f0c','c5800c','5795e3','4d85cc'],
  ['zinc-light','2f2f32','464649','f5f5f6','f6f6f7','f5f5f6','f6f6f7','26874c','2f8652','e91923','e32835','f6a823','f7b13c','386fea','4171dc'],
  ['zinc-dark','d0d0d3','bbbbbe','262629','242427','262629','242427','21b457','20a251','e85c5f','d4585a','df910d','c9830e','5997e4','5289cd'],
  ['stone-light','33302e','494745','f6f6f5','f7f7f6','f6f6f5','f7f7f6','26874c','2f8652','e91923','e32835','f6a823','f7b13c','386fea','4171dc'],
  ['stone-dark','d3d1d0','bebcbb','282423','262321','282423','262321','21b457','21a350','e85d5f','d45859','df910c','ca830d','5997e3','5289cd'],
  ['slate-light','272e3f','3f4555','f2f6fa','f4f7fa','f2f6fa','f4f7fa','26874c','2f8652','f15757','f26969','f6a823','f7b13c','386fea','4171dc'],
  ['slate-dark','dfe2e5','c7cace','1b2637','182234','1b2637','182234','1fb257','1c9f50','731b1c','66191c','dd8f0c','c4800d','5795e3','4d86cd'],
]
