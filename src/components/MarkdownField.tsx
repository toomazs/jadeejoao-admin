import { Bold, Italic, Link2, Pilcrow } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

/**
 * A text field where formatting is formatting, not syntax.
 *
 * The payload stores markdown because the site renders markdown. But asterisks
 * are a storage detail, and showing them to the couple — even faded — turns
 * their own sentence into something that looks broken. A textarea cannot hide
 * them and stay aligned, so this is a contenteditable: bold is bold on screen,
 * and markdown is what gets written to the payload on the way out.
 *
 * Toggling comes free with it. `document.execCommand` is deprecated and still
 * the only thing every browser implements for "make this bold, or un-bold it
 * if it already is" — which is exactly the behaviour a second click needs.
 */

/** Markdown in — the HTML the couple actually sees. */
function toHtml(markdown: string): string {
  const escaped = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const inline = escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*(?!\s)([^*]+?)(?<!\s)\*(?!\*)/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>')

  // A blank line is a paragraph; a single newline is a break inside one.
  return inline
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, '<br>') || '<br>'}</p>`)
    .join('')
}

/** And back out: the DOM the couple built — markdown for the payload. */
function toMarkdown(root: HTMLElement): string {
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
    if (node.nodeType !== Node.ELEMENT_NODE) return ''

    const el = node as HTMLElement
    const inner = [...el.childNodes].map(walk).join('')
    switch (el.tagName) {
      case 'STRONG':
      case 'B':
        return inner.trim() ? `**${inner}**` : inner
      case 'EM':
      case 'I':
        return inner.trim() ? `*${inner}*` : inner
      case 'A':
        return `[${inner}](${el.getAttribute('href') ?? ''})`
      case 'BR':
        return '\n'
      case 'P':
      case 'DIV':
        return `${inner}\n\n`
      default:
        return inner
    }
  }

  return [...root.childNodes]
    .map(walk)
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function MarkdownField({
  value,
  onChange,
  onFocus,
}: {
  value: string
  onChange: (next: string) => void
  /** Fired when the couple clicks in — the panel uses it to move the preview. */
  onFocus?: () => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const [focused, setFocused] = useState(false)
  /** What we last wrote out, so an echo of our own value never resets the caret. */
  const mine = useRef(value)

  useEffect(() => {
    const el = box.current
    if (!el) return
    // Rewriting innerHTML while somebody is typing would drop the caret to the
    // start, so it only happens when the value came from somewhere else.
    if (value === mine.current && el.innerHTML !== '') return
    el.innerHTML = toHtml(value)
    mine.current = value
  }, [value])

  const emit = () => {
    const el = box.current
    if (!el) return
    const markdown = toMarkdown(el)
    mine.current = markdown
    onChange(markdown)
  }

  /** execCommand toggles: bold on bold text removes it, which is the ask. */
  const run = (command: string) => {
    box.current?.focus()
    document.execCommand(command)
    emit()
  }

  const insertLink = () => {
    const el = box.current
    if (!el) return
    el.focus()
    const url = window.prompt('Endereço do link', 'https://')
    if (!url) return
    document.execCommand('createLink', false, url)
    emit()
  }

  const newParagraph = () => {
    box.current?.focus()
    document.execCommand('insertParagraph')
    emit()
  }

  const tools = [
    { icon: Bold, label: 'Negrito', run: () => run('bold') },
    { icon: Italic, label: 'Itálico', run: () => run('italic') },
    { icon: Link2, label: 'Link', run: insertLink },
    { icon: Pilcrow, label: 'Novo parágrafo', run: newParagraph },
  ]

  return (
    <div className="mt-1">
      <div className="flex flex-wrap items-center gap-1 border border-b-0 border-olive-line bg-veil px-1.5 py-1">
        {tools.map(({ icon: Icon, label, run: onRun }) => (
          <button
            key={label}
            type="button"
            title={label}
            aria-label={label}
            // Without this the field loses focus before the command runs, and
            // there is no selection left to format.
            onMouseDown={(event) => event.preventDefault()}
            onClick={onRun}
            className="cursor-pointer p-1.5 text-dark-gray transition-colors hover:text-olive"
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        ))}
      </div>

      <div
        ref={box}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        spellCheck
        onInput={emit}
        onBlur={() => {
          setFocused(false)
          emit()
        }}
        onFocus={() => {
          setFocused(true)
          onFocus?.()
        }}
        onPaste={(event) => {
          // Paste as plain text: pasting from a document otherwise drags in
          // fonts and colours that have nothing to do with the site.
          event.preventDefault()
          const text = event.clipboardData.getData('text/plain')
          document.execCommand('insertText', false, text)
        }}
        className={`w-full border bg-cream px-3 py-2 font-body text-sm leading-[1.55] text-ink [&_a]:text-olive [&_a]:underline [&_p]:mb-2 [&_p:last-child]:mb-0 ${
          focused ? 'border-olive' : 'border-olive-line'
        }`}
      />
    </div>
  )
}
