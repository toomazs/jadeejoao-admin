import { CalendarHeart, Gift, HandCoins, Image, Images, LayoutDashboard, LogOut, MessageSquare, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink } from 'react-router'

import logo from '../../images/logo.webp'
import { useSession } from '../lib/session'

const NAV = [
  { to: '/', label: 'Painel', icon: LayoutDashboard, end: true },
  { to: '/convidados', label: 'Convidados', icon: Users },
  { to: '/recados', label: 'Recados', icon: MessageSquare },
  { to: '/presentes', label: 'Presentes', icon: Gift },
  { to: '/contribuicoes', label: 'Contribuições', icon: HandCoins },
  { to: '/conteudo', label: 'Conteúdo', icon: CalendarHeart },
  { to: '/fotos-dos-capitulos', label: 'Fotos dos capítulos', icon: Images },
  { to: '/midia', label: 'Mídia', icon: Image },
]

/**
 * The frame every screen sits in.
 *
 * The navigation is a column on a desk and a scrolling strip on a phone,
 * because the couple will open this on a phone at the venue as often as at
 * home — and a hamburger hiding seven items would cost a tap every time.
 */
export function Shell({ children }: { children: ReactNode }) {
  const { email, leave } = useSession()

  return (
    // On a wide screen the shell owns the viewport and each screen scrolls
    // inside `main`, so a screen that fits can decide not to scroll at all.
    // Narrow, the page scrolls the ordinary way — a phone has no room for two
    // panes side by side anyway.
    <div className="min-h-svh lg:grid lg:h-svh lg:grid-cols-[15rem_1fr] lg:overflow-hidden">
      <aside className="border-b border-olive-line bg-cream lg:sticky lg:top-0 lg:h-svh lg:border-r lg:border-b-0">
        <div className="flex items-center gap-3 px-4 py-4">
          <img src={logo} alt="" aria-hidden="true" className="h-8 w-auto" />
          <div className="min-w-0">
            <p className="font-display text-lg leading-none text-olive">Painel</p>
            <p className="truncate font-body text-xs text-dark-gray">{email}</p>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2.5 border px-3 py-2 font-body text-sm whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-olive bg-olive text-cream'
                    : 'border-transparent text-dark-gray hover:border-olive-line hover:text-olive'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => void leave()}
          className="mt-1 flex w-full cursor-pointer items-center gap-2.5 px-5 py-3 font-body text-sm text-dark-gray transition-colors hover:text-terracotta lg:absolute lg:bottom-0"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sair
        </button>
      </aside>

      <main className="min-w-0 px-4 py-6 sm:px-6 lg:min-h-0 lg:overflow-y-auto">{children}</main>
    </div>
  )
}

/** One screen's heading. Kept out of Shell so each screen owns its own words. */
export function ScreenTitle({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl text-olive">{title}</h1>
        {subtitle ? <p className="mt-1 font-body text-sm text-dark-gray">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}
