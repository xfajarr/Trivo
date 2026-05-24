import type { SkillPackDefinition } from '../intelligence-types.js'
import { BUILT_IN_SKILL_PACKS } from './skill-pack-registry.js'

function getBuiltInSkillPack(slug: string): SkillPackDefinition {
  const pack = BUILT_IN_SKILL_PACKS.find((item) => item.slug === slug)

  if (!pack) {
    throw new Error(`Missing built-in skill pack: ${slug}`)
  }

  return pack
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term))
}

export function resolveBuiltInSkillPacks(agentSkills: string | null | undefined): SkillPackDefinition[] {
  const skillText = (agentSkills ?? '').toLowerCase()
  const slugs = new Set<string>(['technical-momentum', 'risk-guard', 'market-regime-adapter'])

  if (includesAny(skillText, ['prediction', 'sentiment', 'polymarket'])) {
    slugs.add('sentiment-reader')
  }

  if (skillText.includes('copy')) {
    slugs.add('copy-trading-scout')
  }

  return [...slugs].map(getBuiltInSkillPack)
}
