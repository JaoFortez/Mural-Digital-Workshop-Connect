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
          Mural alimentado por Firebase NoSQL para o PI III.
        </p>
      </footer>
    </main>
  )
}

export default App
