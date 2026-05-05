// src/components/NoticeBoard.jsx
import { useEffect, useState } from 'react'
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase.config'
import './NoticeBoard.css'

export function NoticeBoard() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    const noticesRef = collection(db, 'noticeBoard')
    const noticesQuery = query(noticesRef, orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(
      noticesQuery,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const payload = doc.data()
          const ts = payload.createdAt instanceof Timestamp ? payload.createdAt.toDate() : null
          return {
            id: doc.id,
            title: payload.title || 'Aviso sem título',
            message: payload.message || '',
            type: payload.type || 'update',
            createdAt: ts,
          }
        })

        setAnnouncements(data)
        setLoading(false)
      },
      (fetchError) => {
        console.error('Firestore fetch failed', fetchError)
        setError('Não foi possível carregar os avisos do mural. Por favor, tente novamente mais tarde.')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  async function handleDelete(docId) {
    const confirmed = window.confirm('Tem certeza que deseja excluir este aviso? Esta ação não pode ser desfeita.')
    if (!confirmed) return

    try {
      const docRef = doc(db, 'noticeBoard', docId)
      await deleteDoc(docRef)

      // Remover aviso da lista local
      setAnnouncements((prevAnnouncements) =>
        prevAnnouncements.filter((item) => item.id !== docId)
      )
    } catch (deleteError) {
      console.error('Erro ao excluir aviso:', deleteError)
      alert('Não foi possível excluir o aviso. Tente novamente.')
    }
  }

  return (
    <section aria-labelledby="notice-board-title" className="notice-board" aria-live="polite">
      <header>
        <h2 id="notice-board-title">Mural de Avisos - Workshop Connect</h2>
        <p>
          Atualizações de serviços e alertas de segurança mais recentes da equipe de gerenciamento do workshop.
        </p>
      </header>

      {loading && <p>Carregando avisos …</p>}
      {error && <p role="alert" className="error">{error}</p>}

      {!loading && !error && announcements.length === 0 && (
        <p>Nenhum aviso no momento. Adicione um aviso na coleção Firestore <code>noticeBoard</code>.</p>
      )}

      <ul className="notice-list">
        {announcements.map((item) => (
          <li key={item.id}>
            <article className={`notice-item notice-${item.type}`}>
              <h3>{item.title}</h3>
              {item.createdAt && (
                <time dateTime={item.createdAt.toISOString()}>
                  {item.createdAt.toLocaleDateString('pt-BR')} {item.createdAt.toLocaleTimeString('pt-BR')}
                </time>
              )}
              <p>{item.message}</p>
              <button
                className="delete-button"
                onClick={() => handleDelete(item.id)}
                aria-label={`Excluir aviso: ${item.title}`}
                title="Excluir este aviso"
              >
                🗑️ Excluir
              </button>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
