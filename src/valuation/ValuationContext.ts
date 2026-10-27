import { createContext } from 'react'
import type { Dataset } from './datasets'
import type { ModelInput, ModelOutput } from './engine'
import type { ComputeSource } from './service'

export interface ValuationState {
  /** False until the saved datasets have been read, so pages do not flash an empty state. */
  ready: boolean
  datasets: Dataset[]
  active: Dataset | null
  /** The active dataset's inputs, or a blank set when nothing is uploaded. */
  input: ModelInput
  output: ModelOutput | null
  source: ComputeSource | null
  running: boolean
  error: string | null
  /** Set when a change could not be saved to the database. */
  saveWarning: string | null
  /** Bumped when inputs are replaced wholesale (upload, switch, reset), so form fields remount with the new values. */
  loadId: number
  setInput: (next: ModelInput) => void
  /** Replaces the inputs from outside the form. */
  replaceInput: (next: ModelInput) => void
  run: () => Promise<void>
  /** Adds an uploaded spreadsheet as a new dataset, makes it the active one and works out its forecast. */
  addDataset: (d: { name: string; fileName: string | null; input: ModelInput }) => Promise<void>
  selectDataset: (id: string) => void
  renameDataset: (id: string, name: string) => void
  deleteDataset: (id: string) => void
}

export const ValuationContext = createContext<ValuationState | null>(null)
