import {
  CalendarHeart,
  HandCoins,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink } from 'react-router'

import logo from '../../images/logo.webp'
import { useSession } from '../lib/session'

const NAV = [
  { to: '/', label: 'Painel', icon: LayoutDashboard, end: true },
  { to: '/convidados', label: 'Convidados', icon: Users },
  { to: '/recados', label: 'Recados', icon: MessageSquare },
  { to: '/contribuicoes', label: 'Contribuições', icon: HandCoins },
  { to: '/conteudo', label: 'Conteúdo', icon: CalendarHeart },
]

/**
 * Who is signed in, said as a person rather than as an address.
 *
 * The panel had their email under the logo, which is how a system refers to an
 * account and not how anyone refers to themselves. Three people use this and
 * we know all three, so it can simply greet them.
 */
const WHO: Record<string, { greeting: string; name: string }> = {
  'jadenascimenttoc@gmail.com': { greeting: 'Bem-vinda', name: 'Jade' },
  'joaopedro.dp23@gmail.com': { greeting: 'Bem-vindo', name: 'João' },
  'eduardotoomaz@outlook.com': { greeting: 'Bem-vindo', name: 'Eduardo' },
}

/** Remembered, so the panel opens the way it was left. */
const FOLDED = 'jj-admin:sidebar-folded'

/**
 * The frame every screen sits in.
 *
 * The navigation is a column on a desk and a scrolling strip on a phone,
 * because the couple will open this on a phone at the venue as often as at
 * home — and a hamburger hiding five items would cost a tap every time.
 *
 * On a desk it folds to a rail of icons, for whoever wants the width back for
 * the preview. It stays folded across visits: a preference is not something to
 * set again every morning.
 */
export function Shell({ children }: { children: ReactNode }) {
  const { email, leave } = useSession()
  const [folded, setFolded] = useState(() => localStorage.getItem(FOLDED) === '1')

  useEffect(() => {
    localStorage.setItem(FOLDED, folded ? '1' : '0')
  }, [folded])

  const who = WHO[(email ?? '').toLowerCase()]

  return (
    // On a wide screen the shell owns the viewport and each screen scrolls
    // inside `main`, so a screen that fits can decide not to scroll at all.
    // Narrow, the page scrolls the ordinary way — a phone has no room for two
    // panes side by side anyway.
    <div
      className={`min-h-svh lg:grid lg:h-svh lg:overflow-hidden ${
        folded ? 'lg:grid-cols-[4rem_1fr]' : 'lg:grid-cols-[15rem_1fr]'
      } transition-[grid-template-columns] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]`}
    >
      <aside className="flex flex-col border-b border-olive-line bg-cream lg:h-svh lg:border-r lg:border-b-0">
        <div className={`flex items-center gap-3 px-4 py-4 ${folded ? 'lg:justify-center lg:px-0' : ''}`}>
          <img src={logo} alt="" aria-hidden="true" className="h-8 w-auto shrink-0" />
          <p className={`font-display text-lg leading-none text-olive ${folded ? 'lg:hidden' : ''}`}>
            Painel
          </p>
        </div>

        <nav
          className={`flex gap-1 overflow-x-auto px-2 pb-2 lg:flex-col lg:overflow-visible lg:pb-0 ${
            folded ? 'lg:px-2' : ''
          }`}
        >
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={folded ? label : undefined}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2.5 border px-3 py-2 font-body text-sm whitespace-nowrap transition-colors ${
                  folded ? 'lg:justify-center lg:px-0' : ''
                } ${
                  isActive
                    ? 'border-olive bg-olive text-cream'
                    : 'border-transparent text-dark-gray hover:border-olive-line hover:text-olive'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className={folded ? 'lg:hidden' : ''}>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Pinned to the bottom of the column, where the account lives in
            every panel anybody has used before. */}
        <div className="mt-auto hidden border-t border-sand-line lg:block">
          {who ? (
            <div className={`px-4 py-3 ${folded ? 'lg:px-0 lg:text-center' : ''}`}>
              {folded ? (
                <p className="font-display text-lg text-olive" title={`${who.greeting}, ${who.name}`}>
                  {who.name.charAt(0)}
                </p>
              ) : (
                <>
                  <p className="font-body text-xs text-dark-gray">{who.greeting},</p>
                  <p className="font-display text-lg leading-tight text-olive">{who.name}</p>
                </>
              )}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setFolded((f) => !f)}
            aria-label={folded ? 'Abrir o menu' : 'Recolher o menu'}
            title={folded ? 'Abrir o menu' : 'Recolher o menu'}
            className={`flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 font-body text-sm text-dark-gray transition-colors hover:text-olive ${
              folded ? 'lg:justify-center lg:px-0' : ''
            }`}
          >
            {folded ? (
              <PanelLeftOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <span className={folded ? 'lg:hidden' : ''}>Recolher</span>
          </button>

          <button
            type="button"
            onClick={() => void leave()}
            aria-label="Sair"
            title="Sair"
            className={`flex w-full cursor-pointer items-center gap-2.5 px-4 pb-3 font-body text-sm text-dark-gray transition-colors hover:text-terracotta ${
              folded ? 'lg:justify-center lg:px-0' : ''
            }`}
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className={folded ? 'lg:hidden' : ''}>Sair</span>
          </button>
        </div>

        {/* Narrow, the column is a strip and there is no bottom to pin to. */}
        <button
          type="button"
          onClick={() => void leave()}
          className="flex cursor-pointer items-center gap-2.5 px-5 py-3 font-body text-sm text-dark-gray transition-colors hover:text-terracotta lg:hidden"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sair
        </button>
      </aside>

      <main className="min-w-0 px-4 py-6 sm:px-6 lg:min-h-0 lg:overflow-y-auto">{children}</main>
    </div>
  )
}

export function ScreenTitle({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl text-olive">{title}</h1>
        {subtitle ? <p className="mt-1 font-body text-base text-dark-gray">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
