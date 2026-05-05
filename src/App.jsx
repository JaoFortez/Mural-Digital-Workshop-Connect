import './App.css'
import { NoticeBoard } from './components/NoticeBoard'
import { NoticeForm } from './components/NoticeForm'

function App() {
  return (
    <main>
      <header className="app-header">
        <h1>Workshop Connect</h1>
        <p>
          Mural digital para atualizações de serviço e alertas de segurança da
          oficina.
        </p>
      </header>

      <NoticeForm />

      <NoticeBoard />

      <footer className="app-footer">
        <p>
          Os dados são armazenados na coleção Firestore <code>noticeBoard</code>. Adicione
          avisos a partir do painel do Firebase.
        </p>
      </footer>
    </main>
  )
}

export default App
