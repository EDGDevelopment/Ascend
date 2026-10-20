import { createContext } from 'react'
import type { ModelInput, ModelOutput } from './engine'
import type { ComputeSource } from './service'

export interface ValuationState {
  input: ModelInput
  output: ModelOutput | null
  source: ComputeSource | null
  running: boolean
  error: string | null
  /** Set when the result was computed but could not be saved to the database. */
  saveWarning: string | null
  /** Bumped when inputs are replaced wholesale (upload, reset), so form fields remount with the new values. */
  loadId: number
  setInput: (next: ModelInput) => void
  /** Replaces the inputs from outside the form, such as an uploaded file. */
  replaceInput: (next: ModelInput) => void
  run: () => Promise<void>
}

export const ValuationContext = createContext<ValuationState | null>(null)
