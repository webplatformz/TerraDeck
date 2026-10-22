import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { InfoFooter } from './components/InfoFooter'
import { ProjectNotice } from './components/ProjectNotice'
import { TabBar } from './components/TabBar'
import { useGame } from './game/useGame'
import { About } from './screens/About'
import { Collection } from './screens/Collection'
import { Expedition } from './screens/Expedition'
import { Home } from './screens/Home'
import { noticeStore } from './persistence/noticeStore'

export function App() {
  const game = useGame()
  const { t } = useTranslation()
  const [noticeDismissed, setNoticeDismissed] = useState(() => noticeStore.acknowledged())
  const [noticeSessionOnly, setNoticeSessionOnly] = useState(false)
  const { screen } = game

  if (!game.loaded) return <div className="app" aria-busy="true" />

  return (
    <div className={`app${screen === 'expedition' ? ' app--full' : ''}`}>
      {noticeSessionOnly && <p className="notice-storage-hint" role="status">{t('notice.sessionOnly')}</p>}
      {screen === 'expedition' ? (
        <>
          <Expedition game={game} />
          <InfoFooter />
        </>
      ) : (
        <>
          <TabBar active={screen} onNavigate={game.navigate} />
          <main key={screen} className="app-main screen-in">
            {screen === 'home' && <Home game={game} />}
            {screen === 'collection' && <Collection game={game} />}
            {screen === 'about' && <About game={game} />}
            <InfoFooter />
          </main>
        </>
      )}
      {!noticeDismissed && screen !== 'about' && (
        <ProjectNotice onDismiss={() => setNoticeDismissed(true)} onAcknowledge={() => {
          setNoticeSessionOnly(!noticeStore.acknowledge())
          setNoticeDismissed(true)
        }} />
      )}
    </div>
  )
}
