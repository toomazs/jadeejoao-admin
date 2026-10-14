import { Fragment } from 'react'
import type { ReactNode } from 'react'

const LINK = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/

/**
 * The next unpaired `mark` at or after `from`, or -1. Doubled marks belong to a
 * bold inside, and are stepped over rather than mistaken for the end.
 */
function closingMark(text: string, from: number, mark: string): number {
  for (let at = from; at < text.length; at += 1) {
    if (text[at] !== mark) continue
    if (text[at + 1] === mark) {
      at += 1
      continue
    }
    return at
  }
  return -1
}

/**
 * Bold, italic and links, nested — the twin of the site's renderer.
 *
 * React nodes, never an HTML string. The site duplicates this logic because the
 * two are separate deployables with nothing shared between them; what must not
 * be duplicated is the temptation to build markup by hand. These bodies are
 * written by whoever opens the public site, and this screen is where the couple
 * reads them — an innerHTML here would be a stranger's text running in the
 * panel. The link href is also why: it only ever comes from a match that must
 * begin with http(s), so there is no javascript: to smuggle in.
 */
function renderInline(text: string, depth = 0): ReactNode[] {
  const nodes: ReactNode[] = []
  let plain = ''
  let at = 0
  let key = 0

  const flush = () => {
    if (plain) {
      nodes.push(plain)
      plain = ''
    }
  }
  const wrap = (node: ReactNode) => {
    flush()
    nodes.push(node)
    key += 1
  }

  while (at < text.length) {
    const char = text[at]

    if (char === '[') {
      const link = LINK.exec(text.slice(at))
      if (link) {
        wrap(
          <a
            key={`${depth}-${key}`}
            href={link[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-olive underline decoration-1 underline-offset-4"
          >
            {link[1]}
          </a>,
        )
        at += link[0].length
        continue
      }
    }

    if (char === '*' && text[at + 1] === '*') {
      const close = text.indexOf('**', at + 2)
      if (close > at + 2) {
        wrap(
          <strong key={`${depth}-${key}`}>{renderInline(text.slice(at + 2, close), depth + 1)}</strong>,
        )
        at = close + 2
        continue
      }
    }

    if (char === '*' || char === '_') {
      const close = closingMark(text, at + 1, char)
      if (close > at + 1) {
        wrap(<em key={`${depth}-${key}`}>{renderInline(text.slice(at + 1, close), depth + 1)}</em>)
        at = close + 1
        continue
      }
    }

    plain += char
    at += 1
  }

  flush()
  return nodes
}

/** The inline subset, for a caller that lays out its own paragraphs. */
export function Inline({ text }: { text: string }) {
  return <>{renderInline(text)}</>
}

/**
 * A whole body: blank line between paragraphs, single newline a break inside
 * one — the same shape the site reads, so the couple sees here what a guest
 * sees there.
 */
export function Markdown({ text, className = '' }: { text: string; className?: string }) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  if (paragraphs.length === 0) return null

  return (
    <div className={className}>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className={index > 0 ? 'mt-3' : undefined}>
          {paragraph.split('\n').map((line, lineIndex) => (
            <Fragment key={lineIndex}>
              {lineIndex > 0 ? <br /> : null}
              {renderInline(line)}
            </Fragment>
          ))}
        </p>
      ))}
    </div>
  )
}
