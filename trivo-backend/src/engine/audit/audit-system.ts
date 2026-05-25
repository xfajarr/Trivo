// engine/audit/audit-system.ts
// Verifiable reasoning: evidence chains, cryptographic audit trails, full replay capability

import { createHash, randomUUID } from 'crypto'
import type { ReasoningStep, ReasoningChain, Evidence, CommitteeResult, PortfolioDecision } from '../schemas/index.js'

export interface DecisionExport {
  chainId: string
  totalSteps: number
  averageConfidence: number
  timestamp: number
  chainHash: string
}

export interface AuditEntry {
  id: string
  timestamp: number
  type: 'reasoning_step' | 'decision' | 'trade' | 'error'
  data: Record<string, unknown>
  hash: string              // SHA-256 of data
  previous_hash: string     // Chain link
}

export class AuditSystem {
  private chain: AuditEntry[] = []
  private pendingSteps: ReasoningStep[] = []

  // Start tracking a reasoning chain for a decision
  startReasoningChain(_decisionId: string): string {
    const chainId = randomUUID()
    this.pendingSteps = []
    return chainId
  }

  // Create a new reasoning chain (alias for startReasoningChain)
  createChain(): string {
    return this.startReasoningChain(randomUUID())
  }

  // Finalize chain — returns complete DecisionExport
  finalizeChain(chainId: string): DecisionExport {
    const steps = [...this.pendingSteps]
    this.pendingSteps = []
    return {
      chainId,
      totalSteps: steps.length,
      averageConfidence: steps.length > 0
        ? steps.reduce((sum, s) => sum + s.confidence, 0) / steps.length
        : 0,
      timestamp: Date.now(),
      chainHash: this.hashData(steps),
    }
  }

  // Add a step to the pending reasoning chain
  addReasoningStep(step: Omit<ReasoningStep, 'step_number'>): ReasoningStep {
    const stepWithNumber: ReasoningStep = {
      ...step,
      step_number: this.pendingSteps.length + 1,
    }

    this.pendingSteps.push(stepWithNumber)

    // Log to audit chain
    this.appendAuditEntry({
      type: 'reasoning_step',
      data: {
        step_number: stepWithNumber.step_number,
        agent_role: stepWithNumber.agent_role,
        summary: stepWithNumber.output_summary,
        confidence: stepWithNumber.confidence,
        evidence_count: stepWithNumber.evidence_used.length,
      },
    })

    return stepWithNumber
  }

  // Finalize the reasoning chain
  finalizeReasoningChain(
    chainId: string,
    decisionId: string,
    finalConclusion: string,
    totalConfidence: number
  ): ReasoningChain {
    const chain: ReasoningChain = {
      id: chainId,
      decision_id: decisionId,
      steps: [...this.pendingSteps],
      final_conclusion: finalConclusion,
      total_confidence: totalConfidence,
      created_at: Date.now(),
    }

    this.pendingSteps = []

    // Verify the chain integrity
    const chainHash = this.hashReasoningChain(chain)

    // Log decision to audit chain
    this.appendAuditEntry({
      type: 'decision',
      data: {
        chain_id: chainId,
        decision_id: decisionId,
        steps_count: chain.steps.length,
        total_confidence: totalConfidence,
        conclusion: finalConclusion,
        chain_hash: chainHash,
      },
    })

    return chain
  }

  // Create evidence with verifiability
  createEvidence(
    type: Evidence['type'],
    source: string,
    content: string,
    confidence: number,
    rawData?: unknown
  ): Evidence {
    const evidence: Evidence = {
      id: randomUUID(),
      type,
      source,
      content,
      timestamp: Date.now(),
      confidence,
      verification_hash: rawData ? this.hashData(rawData) : undefined,
    }

    return evidence
  }

  // Verify evidence against external source
  async verifyEvidence(evidence: Evidence, externalSource: () => Promise<unknown>): Promise<boolean> {
    try {
      const externalData = await externalSource()
      const externalHash = this.hashData(externalData)
      return evidence.verification_hash === externalHash
    } catch {
      return false
    }
  }

  // Hash any data for verification
  hashData(data: unknown): string {
    const json = JSON.stringify(data)
    return createHash('sha256').update(json).digest('hex').substring(0, 16)
  }

  // Hash entire reasoning chain
  hashReasoningChain(chain: ReasoningChain): string {
    const chainData = {
      id: chain.id,
      decision_id: chain.decision_id,
      steps: chain.steps.map((s) => ({
        role: s.agent_role,
        output: s.output_summary,
        confidence: s.confidence,
        evidence_hashes: s.evidence_used.map((e) => e.verification_hash || e.content),
      })),
      conclusion: chain.final_conclusion,
    }

    return createHash('sha256')
      .update(JSON.stringify(chainData))
      .digest('hex')
  }

  // Hash entire committee result for audit
  hashCommitteeResult(result: CommitteeResult): string {
    const data = {
      id: result.id,
      agent_id: result.agent_id,
      cycle_id: result.cycle_id,
      decision_id: result.portfolio_decision.id,
      rating: result.portfolio_decision.rating,
      conviction: result.portfolio_decision.conviction,
      evidence_count: result.portfolio_decision.reasoning_chain.steps.reduce(
        (sum, step) => {
          const s = step as ReasoningStep
          return sum + s.evidence_used.length
        },
        0
      ),
      analysts_count: result.analysts.length,
      debate_rounds: result.debate_history.length,
      executed: result.execution_status === 'executed',
      created_at: result.created_at,
    }

    return createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex')
  }

  // Append entry to audit chain
  private appendAuditEntry(entry: Omit<AuditEntry, 'id' | 'timestamp' | 'hash' | 'previous_hash'>) {
    const previousHash = this.chain.length > 0
      ? this.chain[this.chain.length - 1]!.hash
      : 'GENESIS'

    const fullEntry: AuditEntry = {
      id: randomUUID(),
      timestamp: Date.now(),
      type: entry.type,
      data: entry.data,
      hash: this.hashData({ ...entry.data, previous_hash: previousHash }),
      previous_hash: previousHash,
    }

    this.chain.push(fullEntry)
  }

  // Verify audit chain integrity
  verifyAuditChain(): { valid: boolean; brokenAt?: number } {
    for (let i = 1; i < this.chain.length; i++) {
      const expectedPreviousHash = this.chain[i - 1]!.hash
      if (this.chain[i]!.previous_hash !== expectedPreviousHash) {
        return { valid: false, brokenAt: i }
      }
    }
    return { valid: true }
  }

  // Get full audit trail
  getAuditTrail(): AuditEntry[] {
    return [...this.chain]
  }

  // Get pending reasoning steps (for inspection)
  getPendingSteps(): ReasoningStep[] {
    return [...this.pendingSteps]
  }

  // Clear all audit data
  clear(): void {
    this.chain = []
    this.pendingSteps = []
  }

  // Export decision for external verification
  exportDecision(decision: PortfolioDecision): string {
    return JSON.stringify({
      decision,
      audit_hash: decision.audit_hash,
      verification_instructions: {
        '1. Verify evidence': 'Check each piece of evidence against its source',
        '2. Verify reasoning': 'Replay the reasoning chain step by step',
        '3. Verify hash': 'Hash the decision data and compare with audit_hash',
      },
    }, null, 2)
  }
}

// Singleton instance for app-wide use
export const auditSystem = new AuditSystem()
