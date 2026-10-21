import { TabBar } from './components/TabBar'
import { useGame } from './game/useGame'
import { About } from './screens/About'
import { Collection } from './screens/Collection'
import { Expedition } from './screens/Expedition'
import { Home } from './screens/Home'

export function App() {
  const game = useGame()
  const { screen } = game

  if (!game.loaded) return <div className="app" aria-busy="true" />

  if (screen === 'expedition') {
    return (
      <div className="app app--full">
        <Expedition game={game} />
      </div>
    )
  }

  return (
    <div className="app">
      <TabBar active={screen} onNavigate={game.navigate} />
      <main key={screen} className="app-main screen-in">
        {screen === 'home' && <Home game={game} />}
        {screen === 'collection' && <Collection game={game} />}
        {screen === 'about' && <About game={game} />}
      </main>
    </div>
  )
}
