import type { ReactNode } from 'react'

/**
 * A small, safe renderer for the answers the assistant writes: paragraphs, bullet and numbered lists, headings,
 * **bold**, `code` and simple tables. It builds React elements, never HTML strings, so nothing in an answer can
 * inject markup.
 */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) return <code key={i} className="rounded bg-sunken px-1 py-0.5 font-mono text-[0.85em]">{part.slice(1, -1)}</code>
    return part
  })
}

const isRow = (l: string) => /^\s*\|.*\|\s*$/.test(l)
const isDivider = (l: string) => /^\s*\|[\s:|-]+\|\s*$/.test(l)
const cells = (l: string) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())

export function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r/g, '').split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i++
    } else if (isRow(line) && i + 1 < lines.length && isDivider(lines[i + 1])) {
      const head = cells(line)
      i += 2
      const body: string[][] = []
      while (i < lines.length && isRow(lines[i])) body.push(cells(lines[i++]))
      blocks.push(
        <div key={blocks.length} className="my-2 overflow-x-auto">
          <table className="w-full border-collapse text-left text-[13px]">
            <thead>
              <tr>{head.map((h, k) => <th key={k} className="border-b border-line px-2 py-1 font-semibold">{inline(h)}</th>)}</tr>
            </thead>
            <tbody>
              {body.map((r, ri) => <tr key={ri}>{r.map((c, k) => <td key={k} className="border-b border-line-soft px-2 py-1 tabular-nums">{inline(c)}</td>)}</tr>)}
            </tbody>
          </table>
        </div>,
      )
    } else if (/^\s*([-*•])\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*([-*•])\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*([-*•])\s+/, ''))
      blocks.push(<ul key={blocks.length} className="my-1.5 list-disc space-y-1 pl-5">{items.map((t, k) => <li key={k}>{inline(t)}</li>)}</ul>)
    } else if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+[.)]\s+/, ''))
      blocks.push(<ol key={blocks.length} className="my-1.5 list-decimal space-y-1 pl-5">{items.map((t, k) => <li key={k}>{inline(t)}</li>)}</ol>)
    } else if (/^#{1,4}\s+/.test(line)) {
      blocks.push(<p key={blocks.length} className="mb-1 mt-2 font-semibold">{inline(line.replace(/^#{1,4}\s+/, ''))}</p>)
      i++
    } else {
      const para: string[] = []
      while (i < lines.length && lines[i].trim() && !/^\s*([-*•]|\d+[.)])\s+/.test(lines[i]) && !/^#{1,4}\s+/.test(lines[i]) && !isRow(lines[i])) para.push(lines[i++])
      // Keep the model's own line breaks: it uses a single newline to put figures on separate lines.
      blocks.push(
        <p key={blocks.length} className="my-1.5">
          {para.map((l, k) => (
            <span key={k}>
              {k > 0 && <br />}
              {inline(l)}
            </span>
          ))}
        </p>,
      )
    }
  }
  return <div className="text-sm leading-relaxed">{blocks}</div>
}
