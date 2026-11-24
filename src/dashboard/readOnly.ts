import { createContext, useContext } from 'react'

/** True when a page is shown from a shared link: no assistant, no editing. */
export const ReadOnlyContext = createContext(false)
export const useReadOnly = () => useContext(ReadOnlyContext)
