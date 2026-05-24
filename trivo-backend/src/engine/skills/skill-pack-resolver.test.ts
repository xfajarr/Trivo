import { describe, expect, it } from 'vitest'
import { BUILT_IN_SKILL_PACKS } from './skill-pack-registry.js'
import { resolveBuiltInSkillPacks } from './skill-pack-resolver.js'

describe('skill pack resolver', () => {
  it('defines required built-in skill packs', () => {
    const slugs = BUILT_IN_SKILL_PACKS.map((pack) => pack.slug)

    expect(slugs).toContain('technical-momentum')
    expect(slugs).toContain('sentiment-reader')
    expect(slugs).toContain('risk-guard')
    expect(slugs).toContain('copy-trading-scout')
    expect(slugs).toContain('market-regime-adapter')
  })

  it('always includes risk guard and market regime adapter', () => {
    const packs = resolveBuiltInSkillPacks('perp')
    const slugs = packs.map((pack) => pack.slug)

    expect(slugs).toContain('risk-guard')
    expect(slugs).toContain('market-regime-adapter')
  })

  it('includes sentiment reader when agent skills mention sentiment or prediction', () => {
    const packs = resolveBuiltInSkillPacks('prediction,sentiment')
    const slugs = packs.map((pack) => pack.slug)

    expect(slugs).toContain('sentiment-reader')
  })
})
