/** Lets any button on any page ask the assistant a question, without the page knowing about the chat panel. */
export const ASK_EVENT = 'ascend:ask'

export function askAscend(question: string) {
  window.dispatchEvent(new CustomEvent<string>(ASK_EVENT, { detail: question }))
}
