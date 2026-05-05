import './App.css'
import { collection, deleteDoc, getDocs } from 'firebase/firestore'
import { useState, useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'
import { db } from './firebase.config'
import { NoticeBoard } from './components/NoticeBoard'
import { NoticeForm } from './components/NoticeForm'

function App() {
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light'
    setTheme(savedTheme)
    document.documentElement.setAttribute('data-theme', savedTheme)
  }, [])

  function toggleTheme() {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  async function handleDeleteAll() {
    const confirmed = window.confirm(
      'ATENÇÃO: Esta ação irá excluir TODOS os avisos permanentemente. Tem certeza absoluta de que deseja continuar?'
    )
    if (!confirmed) return

    const secondConfirm = window.confirm(
      'Confirmação final: Todos os avisos serão perdidos. Esta ação não pode ser desfeita. Prosseguir?'
    )
    if (!secondConfirm) return

    try {
      const noticesRef = collection(db, 'noticeBoard')
      const snapshot = await getDocs(noticesRef)
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref))
      await Promise.all(deletePromises)
      alert('Todos os avisos foram excluídos com sucesso.')
    } catch (error) {
      console.error('Erro ao excluir todos os avisos:', error)
      alert('Ocorreu um erro ao excluir os avisos. Tente novamente.')
    }
  }

  return (
    <main>
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1>Workshop Connect</h1>
            <p>
              Mural digital para atualizações de serviço e alertas de segurança da
              oficina.
            </p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="theme-toggle"
            aria-label={`Alternar para tema ${theme === 'light' ? 'escuro' : 'claro'}`}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
      </header>

      <NoticeForm />

      <NoticeBoard />

      <footer className="app-footer">
        <p>
          Mural alimentado por Firebase NoSQL para o PI III.
        </p>
        <button
          type="button"
          onClick={handleDeleteAll}
          className="delete-all-button"
          title="Botão de emergência: excluir todos os avisos (apenas para administradores)"
        >
          ⚠️ Limpar Mural
        </button>
      </footer>
    </main>
  )
}

export default App
