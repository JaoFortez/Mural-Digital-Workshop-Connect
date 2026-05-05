// src/components/NoticeBoard.jsx
import { useEffect, useMemo, useState } from 'react'
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore'
import { Clock, Info, ShieldAlert, Tag } from 'lucide-react'
import { db } from '../firebase.config'
import './NoticeBoard.css'

const filterOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'update', label: 'Atualização' },
  { value: 'alert', label: 'Alerta' },
  { value: 'promotion', label: 'Promoção' },
  { value: 'safety', label: 'Segurança' },
  { value: 'schedule', label: 'Funcionamento' },
  { value: 'tip', label: 'Dica' },
  { value: 'team', label: 'Equipe' },
]

const badgeMap = {
  update: { color: 'badge-update', label: 'Atualização', Icon: Info },
  alert: { color: 'badge-alert', label: 'Alerta', Icon: Info },
  promotion: { color: 'badge-promotion', label: 'Promoção', Icon: Tag },
  safety: { color: 'badge-safety', label: 'Segurança', Icon: ShieldAlert },
  schedule: { color: 'badge-schedule', label: 'Funcionamento', Icon: Clock },
  tip: { color: 'badge-tip', label: 'Dica', Icon: Tag },
  team: { color: 'badge-team', label: 'Equipe', Icon: Tag },
}

const defaultBadge = badgeMap.update

function NoticeSkeleton() {
  return (
    <ul className="notice-list notice-skeleton-list" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, index) => (
        <li key={index}>
          <article className="notice-item notice-skeleton">
            <div className="skeleton-title skeleton-block" />
            <div className="skeleton-meta skeleton-block" />
            <div className="skeleton-message skeleton-block" />
            <div className="skeleton-message skeleton-block skeleton-short" />
          </article>
        </li>
      ))}
    </ul>
  )
}

function formatRelativeDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date)) {
    return 'Data não disponível'
  }

  const now = new Date()
  const diffMs = now - date
  const diffMinutes = Math.floor(diffMs / 60000)

  const isSameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  if (diffMinutes < 1) {
    return 'Postado agora'
  }

  if (diffMinutes < 60) {
    return `Postado há ${diffMinutes} ${diffMinutes === 1 ? 'minuto' : 'minutos'}`
  }

  if (isSameDay) {
    return `Postado hoje às ${date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`
  }

  return `Postado em ${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

export function NoticeBoard() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeFilter, setActiveFilter] = useState('all')

  const filteredAnnouncements = useMemo(
    () =>
      activeFilter === 'all'
        ? announcements
        : announcements.filter((item) => item.type === activeFilter),
    [activeFilter, announcements]
  )

  const activeFilterLabel = useMemo(
    () => filterOptions.find((option) => option.value === activeFilter)?.label || 'Todos',
    [activeFilter]
  )

  const showEmptyState = !loading && !error && filteredAnnouncements.length === 0

  function handleFilter(type) {
    setActiveFilter(type)
  }

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
            createdAt: ts || new Date(),
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

      <div className="notice-filter-bar" role="tablist" aria-label="Filtros de categoria de aviso">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`filter-button ${activeFilter === option.value ? 'filter-button-active' : ''}`}
            onClick={() => handleFilter(option.value)}
            role="tab"
            aria-selected={activeFilter === option.value}
          >
            {option.label}
          </button>
        ))}
      </div>

      {activeFilter !== 'all' && (
        <div className="active-filter-label">
          Filtrando por: <strong>{activeFilterLabel}</strong>
        </div>
      )}

      {loading && (
        <div role="status" aria-live="polite">
          <p className="sr-only">Carregando avisos …</p>
          <NoticeSkeleton />
        </div>
      )}
      {error && <p role="alert" className="error">{error}</p>}

      {showEmptyState && (
        <p>
          {activeFilter === 'all'
            ? 'O mural está limpo no momento. Use o formulário acima para publicar o primeiro aviso.'
            : `Nenhum aviso encontrado para "${activeFilterLabel}". Tente outro filtro.`}
        </p>
      )}

      <ul className="notice-list">
        {filteredAnnouncements.map((item) => {
          const badge = badgeMap[item.type] ?? defaultBadge
          const Icon = badge.Icon

          return (
            <li key={item.id}>
              <article className={`notice-item notice-${item.type}`}>
                <div className="notice-card-header">
                  <span className={`notice-icon ${badge.color}`}>
                    <Icon size={16} />
                  </span>
                  <span className={`notice-badge ${badge.color}`}>{badge.label}</span>
                  <h3>{item.title}</h3>
                </div>
                {item.createdAt && (
                  <time dateTime={item.createdAt.toISOString()}>
                    {formatRelativeDate(item.createdAt)}
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
          )
        })}
      </ul>
    </section>
  )
}
