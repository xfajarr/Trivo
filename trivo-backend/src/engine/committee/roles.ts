import type { CommitteeRole } from '../intelligence-types.js'

export const COMMITTEE_ROLES: CommitteeRole[] = [
  'technical_analyst',
  'sentiment_analyst',
  'risk_analyst',
  'bull_researcher',
  'bear_researcher',
  'portfolio_manager',
]

export const REQUIRED_COMMITTEE_QUORUM = 4
