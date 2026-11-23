import { parseOpportunities, type Opportunity } from '../../supabase/functions/_shared/chat/opportunities'
import { AiError, callFunction } from './functionClient'

export type { Opportunity }

/** A written plan, and which results it was written from. */
export interface SavedPlan {
  items: Opportunity[]
  generatedAt: string
  /** `computedAt` of the model results the plan was written from, to tell when the numbers have since changed. */
  basedOn: string
}

/** Asks the `opportunities` Edge Function for a ranked growth plan from the digest of the open spreadsheet. */
export async function generatePlan(context: string, basedOn: string, signal?: AbortSignal): Promise<SavedPlan> {
  const res = await callFunction('opportunities', { context }, signal)
  const items = parseOpportunities(JSON.stringify(await res.json().catch(() => null)))
  if (!items) throw new AiError('The growth plan came back in an unexpected form. Try again.')
  return { items, generatedAt: new Date().toISOString(), basedOn }
}

// Kept in this browser, one plan per user and spreadsheet, so coming back to the page does not cost another run.
const key = (userId: string, datasetId: string) => `ascend.plan.v1.${userId}.${datasetId}`

export function loadPlan(userId: string, datasetId: string): SavedPlan | null {
  try {
    const raw = localStorage.getItem(key(userId, datasetId))
    const p = raw ? (JSON.parse(raw) as Partial<SavedPlan>) : null
    const items = p ? parseOpportunities(JSON.stringify(p.items ?? null)) : null
    return items && typeof p?.generatedAt === 'string' ? { items, generatedAt: p.generatedAt, basedOn: String(p.basedOn ?? '') } : null
  } catch {
    return null
  }
}

export function savePlan(userId: string, datasetId: string, plan: SavedPlan) {
  try {
    localStorage.setItem(key(userId, datasetId), JSON.stringify(plan))
  } catch {
    // Storage can be full or blocked. The plan still shows for this visit.
  }
}
