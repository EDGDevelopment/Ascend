import { useContext } from 'react'
import { ValuationContext } from './ValuationContext'

export function useValuation() {
  const ctx = useContext(ValuationContext)
  if (!ctx) throw new Error('useValuation must be used inside ValuationProvider')
  return ctx
}
