import { Route, Routes } from 'react-router'

import { Shell } from './components/Shell'
import { useSession } from './lib/session'
import { ChangePassword } from './screens/ChangePassword'
import { Contributions } from './screens/Contributions'
import { Content } from './screens/Content'
import { Dashboard } from './screens/Dashboard'
import { Gifts } from './screens/Gifts'
import { Guests } from './screens/Guests'
import { Login } from './screens/Login'
import { Media } from './screens/Media'
import { Messages } from './screens/Messages'

/**
 * Three gates, in order: signed in, password chosen, then the panel.
 *
 * The middle one is mirrored by the API, which refuses every admin route while
 * a temporary password stands. This is the readable half of that rule; the
 * enforced half is in the middleware, where it cannot be skipped.
 */
export function App() {
  const { session, ready, mustChange } = useSession()

  // Reading the stored session is a tick or two of work. Showing the login
  // form during it would flash it at somebody already signed in.
  if (!ready) return <div className="min-h-svh bg-veil" />
  if (!session) return <Login />
  if (mustChange) return <ChangePassword />

  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/convidados" element={<Guests />} />
        <Route path="/recados" element={<Messages />} />
        <Route path="/presentes" element={<Gifts />} />
        <Route path="/contribuicoes" element={<Contributions />} />
        <Route path="/conteudo" element={<Content />} />
        <Route path="/midia" element={<Media />} />
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </Shell>
  )
}
