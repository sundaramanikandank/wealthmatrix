import type { Instrument, OptionType, Side } from '../store/strategyStore'

export interface StrategyLeg {
  type: OptionType
  strikeOffset: number // Offset from ATM (e.g., +50, -100)
  side: Side
  lots: number
  isFuture?: boolean
}

export interface Strategy {
  id: string
  name: string
  description: string
  category: 'bullish' | 'bearish' | 'neutral'
  risk: 'Limited' | 'Unlimited'
  reward: 'Limited' | 'Unlimited'
  legs: StrategyLeg[]
  svgPoints: Array<[number, number]>
}

export const STRATEGIES: Strategy[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // 🟢 BULLISH STRATEGIES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'long-call',
    name: 'Long Call',
    description: 'Unlimited upside, limited risk',
    category: 'bullish',
    risk: 'Limited',
    reward: 'Unlimited',
    legs: [{ type: 'CE', strikeOffset: 50, side: 'BUY', lots: 1 }],
    svgPoints: [[0, 40], [55, 40], [120, 10]],
  },
  {
    id: 'bull-call-spread',
    name: 'Bull Call Spread',
    description: 'Capped profit, lower cost than long call',
    category: 'bullish',
    risk: 'Limited',
    reward: 'Limited',
    legs: [
      { type: 'CE', strikeOffset: 0, side: 'BUY', lots: 1 },
      { type: 'CE', strikeOffset: 200, side: 'SELL', lots: 1 },
    ],
    svgPoints: [[0, 42], [40, 42], [80, 15], [120, 15]],
  },
  {
    id: 'bull-put-spread',
    name: 'Bull Put Spread',
    description: 'Earn credit in bullish to neutral markets',
    category: 'bullish',
    risk: 'Limited',
    reward: 'Limited',
    legs: [
      { type: 'PE', strikeOffset: 0, side: 'SELL', lots: 1 },
      { type: 'PE', strikeOffset: -200, side: 'BUY', lots: 1 },
    ],
    svgPoints: [[0, 15], [40, 15], [80, 42], [120, 42]],
  },
  {
    id: 'short-put',
    name: 'Short Put',
    description: 'Collect premium, bullish bias',
    category: 'bullish',
    risk: 'Unlimited',
    reward: 'Limited',
    legs: [{ type: 'PE', strikeOffset: -50, side: 'SELL', lots: 1 }],
    svgPoints: [[0, 10], [55, 10], [120, 40]],
  },
  {
    id: 'call-ratio-back-spread',
    name: 'Call Ratio Back Spread',
    description: 'Profits from big upside move',
    category: 'bullish',
    risk: 'Limited',
    reward: 'Unlimited',
    legs: [
      { type: 'CE', strikeOffset: 0, side: 'SELL', lots: 1 },
      { type: 'CE', strikeOffset: 100, side: 'BUY', lots: 2 },
    ],
    svgPoints: [[0, 42], [45, 25], [60, 42], [120, 10]],
  },
  {
    id: 'covered-call',
    name: 'Covered Call',
    description: 'Income on existing long position',
    category: 'bullish',
    risk: 'Unlimited',
    reward: 'Limited',
    legs: [
      { type: 'CE', strikeOffset: 0, side: 'BUY', lots: 1, isFuture: true },
      { type: 'CE', strikeOffset: 200, side: 'SELL', lots: 1 },
    ],
    svgPoints: [[0, 42], [60, 15], [120, 15]],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔴 BEARISH STRATEGIES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'long-put',
    name: 'Long Put',
    description: 'Profit from sharp downside',
    category: 'bearish',
    risk: 'Limited',
    reward: 'Unlimited',
    legs: [{ type: 'PE', strikeOffset: -50, side: 'BUY', lots: 1 }],
    svgPoints: [[0, 10], [55, 40], [120, 40]],
  },
  {
    id: 'bear-put-spread',
    name: 'Bear Put Spread',
    description: 'Capped profit, lower cost than long put',
    category: 'bearish',
    risk: 'Limited',
    reward: 'Limited',
    legs: [
      { type: 'PE', strikeOffset: 0, side: 'BUY', lots: 1 },
      { type: 'PE', strikeOffset: -200, side: 'SELL', lots: 1 },
    ],
    svgPoints: [[0, 15], [40, 15], [80, 42], [120, 42]],
  },
  {
    id: 'bear-call-spread',
    name: 'Bear Call Spread',
    description: 'Earn credit in bearish to neutral markets',
    category: 'bearish',
    risk: 'Limited',
    reward: 'Limited',
    legs: [
      { type: 'CE', strikeOffset: 0, side: 'SELL', lots: 1 },
      { type: 'CE', strikeOffset: 200, side: 'BUY', lots: 1 },
    ],
    svgPoints: [[0, 42], [40, 42], [80, 15], [120, 15]],
  },
  {
    id: 'short-call',
    name: 'Short Call',
    description: 'Collect premium, bearish bias',
    category: 'bearish',
    risk: 'Unlimited',
    reward: 'Limited',
    legs: [{ type: 'CE', strikeOffset: 50, side: 'SELL', lots: 1 }],
    svgPoints: [[0, 40], [55, 40], [120, 10]],
  },
  {
    id: 'put-ratio-back-spread',
    name: 'Put Ratio Back Spread',
    description: 'Profits from big downside move',
    category: 'bearish',
    risk: 'Limited',
    reward: 'Unlimited',
    legs: [
      { type: 'PE', strikeOffset: 0, side: 'SELL', lots: 1 },
      { type: 'PE', strikeOffset: -100, side: 'BUY', lots: 2 },
    ],
    svgPoints: [[0, 10], [60, 42], [75, 25], [120, 42]],
  },
  {
    id: 'protective-put',
    name: 'Protective Put',
    description: 'Hedge on long futures position',
    category: 'bearish',
    risk: 'Limited',
    reward: 'Unlimited',
    legs: [
      { type: 'CE', strikeOffset: 0, side: 'BUY', lots: 1, isFuture: true },
      { type: 'PE', strikeOffset: -200, side: 'BUY', lots: 1 },
    ],
    svgPoints: [[0, 42], [40, 42], [80, 15], [120, 10]],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🟡 NON-DIRECTIONAL STRATEGIES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'long-straddle',
    name: 'Long Straddle',
    description: 'Profit from big move in either direction',
    category: 'neutral',
    risk: 'Limited',
    reward: 'Unlimited',
    legs: [
      { type: 'CE', strikeOffset: 0, side: 'BUY', lots: 1 },
      { type: 'PE', strikeOffset: 0, side: 'BUY', lots: 1 },
    ],
    svgPoints: [[0, 10], [60, 45], [120, 10]],
  },
  {
    id: 'short-straddle',
    name: 'Short Straddle',
    description: 'Collect premium, profit if range-bound',
    category: 'neutral',
    risk: 'Unlimited',
    reward: 'Limited',
    legs: [
      { type: 'CE', strikeOffset: 0, side: 'SELL', lots: 1 },
      { type: 'PE', strikeOffset: 0, side: 'SELL', lots: 1 },
    ],
    svgPoints: [[0, 45], [60, 10], [120, 45]],
  },
  {
    id: 'long-strangle',
    name: 'Long Strangle',
    description: 'Cheaper than straddle, needs bigger move',
    category: 'neutral',
    risk: 'Limited',
    reward: 'Unlimited',
    legs: [
      { type: 'CE', strikeOffset: 200, side: 'BUY', lots: 1 },
      { type: 'PE', strikeOffset: -200, side: 'BUY', lots: 1 },
    ],
    svgPoints: [[0, 10], [40, 45], [80, 45], [120, 10]],
  },
  {
    id: 'short-strangle',
    name: 'Short Strangle',
    description: 'Wider breakevens than short straddle',
    category: 'neutral',
    risk: 'Unlimited',
    reward: 'Limited',
    legs: [
      { type: 'CE', strikeOffset: 200, side: 'SELL', lots: 1 },
      { type: 'PE', strikeOffset: -200, side: 'SELL', lots: 1 },
    ],
    svgPoints: [[0, 45], [40, 10], [80, 10], [120, 45]],
  },
  {
    id: 'iron-condor',
    name: 'Iron Condor',
    description: '4-leg range strategy, capped on both sides',
    category: 'neutral',
    risk: 'Limited',
    reward: 'Limited',
    legs: [
      { type: 'PE', strikeOffset: -400, side: 'BUY', lots: 1 },
      { type: 'PE', strikeOffset: -200, side: 'SELL', lots: 1 },
      { type: 'CE', strikeOffset: 200, side: 'SELL', lots: 1 },
      { type: 'CE', strikeOffset: 400, side: 'BUY', lots: 1 },
    ],
    svgPoints: [[0, 42], [25, 42], [45, 15], [75, 15], [95, 42], [120, 42]],
  },
  {
    id: 'iron-fly',
    name: 'Iron Fly',
    description: 'Higher reward than Iron Condor, tighter range',
    category: 'neutral',
    risk: 'Limited',
    reward: 'Limited',
    legs: [
      { type: 'PE', strikeOffset: -200, side: 'BUY', lots: 1 },
      { type: 'PE', strikeOffset: 0, side: 'SELL', lots: 1 },
      { type: 'CE', strikeOffset: 0, side: 'SELL', lots: 1 },
      { type: 'CE', strikeOffset: 200, side: 'BUY', lots: 1 },
    ],
    svgPoints: [[0, 42], [45, 15], [75, 15], [120, 42]],
  },
  {
    id: 'long-butterfly',
    name: 'Long Butterfly',
    description: 'Profit if underlying stays near ATM',
    category: 'neutral',
    risk: 'Limited',
    reward: 'Limited',
    legs: [
      { type: 'CE', strikeOffset: -200, side: 'BUY', lots: 1 },
      { type: 'CE', strikeOffset: 0, side: 'SELL', lots: 2 },
      { type: 'CE', strikeOffset: 200, side: 'BUY', lots: 1 },
    ],
    svgPoints: [[0, 42], [30, 42], [60, 12], [90, 42], [120, 42]],
  },
  {
    id: 'short-butterfly',
    name: 'Short Butterfly',
    description: 'Profit from big move, inverse butterfly',
    category: 'neutral',
    risk: 'Limited',
    reward: 'Limited',
    legs: [
      { type: 'CE', strikeOffset: -200, side: 'SELL', lots: 1 },
      { type: 'CE', strikeOffset: 0, side: 'BUY', lots: 2 },
      { type: 'CE', strikeOffset: 200, side: 'SELL', lots: 1 },
    ],
    svgPoints: [[0, 12], [30, 12], [60, 42], [90, 12], [120, 12]],
  },
  {
    id: 'calendar-spread',
    name: 'Calendar Spread',
    description: 'Profit from time decay difference',
    category: 'neutral',
    risk: 'Limited',
    reward: 'Limited',
    legs: [
      { type: 'CE', strikeOffset: 0, side: 'SELL', lots: 1 },
      { type: 'CE', strikeOffset: 0, side: 'BUY', lots: 1 }, // Different expiry in practice
    ],
    svgPoints: [[0, 35], [45, 35], [60, 15], [75, 35], [120, 35]],
  },
  {
    id: 'jade-lizard',
    name: 'Jade Lizard',
    description: 'No upside risk, premium collection',
    category: 'neutral',
    risk: 'Limited',
    reward: 'Limited',
    legs: [
      { type: 'CE', strikeOffset: 200, side: 'SELL', lots: 1 },
      { type: 'PE', strikeOffset: 0, side: 'SELL', lots: 1 },
      { type: 'PE', strikeOffset: -200, side: 'BUY', lots: 1 },
    ],
    svgPoints: [[0, 15], [50, 15], [80, 42], [120, 42]],
  },
]

export function getStrategiesByCategory(category: 'bullish' | 'bearish' | 'neutral') {
  return STRATEGIES.filter(s => s.category === category)
}

export function getStrategyById(id: string) {
  return STRATEGIES.find(s => s.id === id)
}

export function calculateATM(spot: number, instrument: Instrument): number {
  const step = instrument === 'NIFTY' ? 50 : 100
  return Math.round(spot / step) * step
}
