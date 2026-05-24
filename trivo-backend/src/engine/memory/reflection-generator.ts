export interface ReflectionSummaryInput {
  market: string
  side: string
  pnl: number
  reasoning: string
  missReasons?: string[]
  nextAction?: string
}

export interface ReflectionSummary {
  outcome: 'profit' | 'loss' | 'breakeven'
  wasCorrect: boolean
  lesson: string
  missReasons: string
  nextAction: string
  mistakePattern: string
  improvement: string
  summary: string
}

function text(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.replace(/\s+/g, ' ').trim()
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value)
  }
  if (value instanceof Date) return value.toISOString()
  return JSON.stringify(value).replace(/\s+/g, ' ').trim()
}

function compactList(items: string[] | undefined, fallback: string): string {
  const cleaned = (items ?? [])
    .map((item) => text(item))
    .filter((item) => item.length > 0)
  return cleaned.length > 0 ? cleaned.join('; ') : fallback
}

export function buildReflectionSummary(input: ReflectionSummaryInput): ReflectionSummary {
  const market = text(input.market)
  const side = text(input.side)
  const reasoning = text(input.reasoning)
  const outcome: ReflectionSummary['outcome'] = input.pnl > 0 ? 'profit' : input.pnl < 0 ? 'loss' : 'breakeven'
  const wasCorrect = outcome === 'profit'
  const missReasons = compactList(input.missReasons, wasCorrect ? 'none' : reasoning || 'insufficient confirmation')
  const nextAction = text(
    input.nextAction ??
      (wasCorrect
        ? 'Keep the same thesis, but only scale after confirmation.'
        : 'Reduce size, wait for confirmation, and tighten risk on the next setup.'),
  )

  const lesson = wasCorrect
    ? `${market} ${side} worked because ${reasoning || 'the setup held'}.`
    : `${market} ${side} lost because ${reasoning || 'the setup failed'}.`

  const mistakePattern = wasCorrect ? 'none' : missReasons
  const improvement = wasCorrect
    ? 'Keep the same setup and only add size after confirmation.'
    : 'Reduce size, wait for stronger confirmation, and avoid the same miss pattern.'

  const nextActionLine = nextAction.replace(/[.?!]+$/, '')
  const summary = `${market} ${side} ended in ${outcome}. Miss reasons: ${missReasons}. Next action: ${nextActionLine}.`

  return {
    outcome,
    wasCorrect,
    lesson,
    missReasons,
    nextAction,
    mistakePattern,
    improvement,
    summary,
  }
}
