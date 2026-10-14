import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Markdown } from './Markdown'

describe('Markdown no painel', () => {
  it('lê o negrito que o site renderiza, em vez de mostrar os asteriscos', () => {
    const { container } = render(<Markdown text="Vai ser **lindo** demais." />)
    expect(container.querySelector('strong')?.textContent).toBe('lindo')
    expect(container.textContent).not.toContain('*')
  })

  it('separa os parágrafos de quem escreveu dois', () => {
    const { container } = render(<Markdown text={'Primeiro.\n\nSegundo.'} />)
    expect(container.querySelectorAll('p')).toHaveLength(2)
  })

  it('nunca monta HTML a partir do texto de um estranho', () => {
    const { container } = render(
      <Markdown text={'<img src=x onerror="alert(1)"> e <b>isso</b>'} />,
    )
    // It arrives as text and stays text: no element the guest named exists.
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('b')).toBeNull()
    expect(container.textContent).toContain('<img src=x')
  })

  it('não deixa um link virar javascript:', () => {
    const { container } = render(<Markdown text="[clique](javascript:alert(1))" />)
    expect(container.querySelector('a')).toBeNull()
    expect(container.textContent).toContain('[clique]')
  })
})
