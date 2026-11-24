import { supabase } from '@/lib/supabase'
import type { Dataset } from '@/valuation/datasets'

/** One link the signed-in user has made. */
export interface ShareLink {
  token: string
  name: string
  createdAt: string
  /** ISO time the link stops working, or null if it never does. */
  expiresAt: string | null
}

const isDataset = (d: unknown): d is Dataset => {
  const x = d as Dataset
  return !!x && typeof x.id === 'string' && !!x.input && Array.isArray(x.input.monthly) && !!x.output?.forecast
}

/** 192 random bits as URL-safe text. Long enough that a link cannot be guessed. */
export function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export const shareUrl = (token: string) => `${window.location.origin}/shared/${token}`

// Without a Supabase project (demo mode) links are kept in this browser only, so they open here and nowhere else.
interface LocalRow extends ShareLink {
  ownerId: string
  payload: Dataset
}
const LOCAL_KEY = 'ascend.shares.v1'
const readLocal = (): Record<string, LocalRow> => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '{}') as Record<string, LocalRow>
  } catch {
    return {}
  }
}
const writeLocal = (rows: Record<string, LocalRow>) => {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(rows))
  } catch {
    // Storage full or blocked: the link simply will not be saved.
  }
}

/** True when links work for other people on other devices. False means demo mode: this browser only. */
export const sharesAreOnline = () => supabase !== null

export async function createShare(userId: string, dataset: Dataset, days: number | null): Promise<ShareLink> {
  const link: ShareLink = {
    token: newToken(),
    name: dataset.name,
    createdAt: new Date().toISOString(),
    expiresAt: days === null ? null : new Date(Date.now() + days * 86_400_000).toISOString(),
  }
  if (!supabase) {
    writeLocal({ ...readLocal(), [link.token]: { ...link, ownerId: userId, payload: dataset } })
    return link
  }
  const { error } = await supabase.from('shared_reports').insert({ token: link.token, owner_id: userId, name: link.name, payload: dataset, expires_at: link.expiresAt })
  if (error) throw new Error(/relation .* does not exist|shared_reports/i.test(error.message) ? 'Sharing is not set up on the database yet (migration 0005).' : error.message)
  return link
}

export async function listShares(userId: string): Promise<ShareLink[]> {
  if (!supabase) {
    return Object.values(readLocal())
      .filter((r) => r.ownerId === userId)
      .map(({ token, name, createdAt, expiresAt }) => ({ token, name, createdAt, expiresAt }))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  }
  const { data, error } = await supabase.from('shared_reports').select('token, name, created_at, expires_at').eq('owner_id', userId).order('created_at', { ascending: false })
  if (error || !data) return []
  return data.map((r) => ({ token: r.token, name: r.name, createdAt: r.created_at, expiresAt: r.expires_at }))
}

export async function revokeShare(userId: string, token: string): Promise<void> {
  if (!supabase) {
    const rows = readLocal()
    if (rows[token]?.ownerId === userId) delete rows[token]
    writeLocal(rows)
    return
  }
  await supabase.from('shared_reports').delete().eq('token', token).eq('owner_id', userId)
}

/** The report behind a link, or null if it is unknown, revoked or expired. Needs no sign-in. */
export async function fetchShared(token: string): Promise<Dataset | null> {
  if (!/^[A-Za-z0-9_-]{32,64}$/.test(token)) return null
  if (!supabase) {
    const row = readLocal()[token]
    if (!row || (row.expiresAt && new Date(row.expiresAt) < new Date())) return null
    return isDataset(row.payload) ? row.payload : null
  }
  const { data, error } = await supabase.rpc('get_shared_report', { p_token: token })
  return !error && isDataset(data) ? data : null
}
