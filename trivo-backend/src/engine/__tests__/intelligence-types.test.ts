import { describe, expect, it } from 'vitest'
import type { CommitteeRole, MarketRegime, RiskDecisionStatus } from '../intelligence-types.js'

function acceptsRole(role: CommitteeRole) {
  return role
}

function acceptsRegime(regime: MarketRegime) {
  return regime
}

function acceptsRiskStatus(status: RiskDecisionStatus) {
  return status
}

describe('intelligence shared types', () => {
  it('allows expected committee roles and regimes', () => {
    expect(acceptsRole('technical_analyst')).toBe('technical_analyst')
    expect(acceptsRole('portfolio_manager')).toBe('portfolio_manager')
    expect(acceptsRegime('volatile')).toBe('volatile')
    expect(acceptsRiskStatus('blocked')).toBe('blocked')
  })
})
