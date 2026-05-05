// src/components/NoticeBoard.jsx
import { useEffect, useMemo, useState } from 'react'
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore'
import { Clock, Info, ShieldAlert, Tag, Search, Download, SortAsc } from 'lucide-react'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
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

function sortNotices(notices, sortOption, specificDate) {
  const sorted = [...notices]

  switch (sortOption) {
    case 'a-z':
      return sorted.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
    case 'oldest':
      return sorted.sort((a, b) => a.createdAt - b.createdAt)
    case 'newest':
      return sorted.sort((a, b) => b.createdAt - a.createdAt)
    case 'date':
      if (specificDate) {
        const targetDate = new Date(specificDate)
        return sorted.filter(notice => {
          const noticeDate = new Date(notice.createdAt)
          return noticeDate.toDateString() === targetDate.toDateString()
        })
      }
      return sorted
    default:
      return sorted
  }
}

function filterNoticesBySearch(notices, searchTerm) {
  if (!searchTerm.trim()) return notices

  const term = searchTerm.toLowerCase()
  return notices.filter(notice =>
    notice.title.toLowerCase().includes(term) ||
    notice.message.toLowerCase().includes(term)
  )
}

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
  const [expandedItem, setExpandedItem] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOption, setSortOption] = useState('newest')
  const [specificDate, setSpecificDate] = useState('')

  const filteredByCategory = useMemo(
    () =>
      activeFilter === 'all'
        ? announcements
        : announcements.filter((item) => item.type === activeFilter),
    [activeFilter, announcements]
  )

  const filteredBySearch = useMemo(
    () => filterNoticesBySearch(filteredByCategory, searchTerm),
    [filteredByCategory, searchTerm]
  )

  const sortedAndFiltered = useMemo(
    () => sortNotices(filteredBySearch, sortOption, specificDate),
    [filteredBySearch, sortOption, specificDate]
  )

  const activeFilterLabel = useMemo(
    () => filterOptions.find((option) => option.value === activeFilter)?.label || 'Todos',
    [activeFilter]
  )

  const showEmptyState = !loading && !error && sortedAndFiltered.length === 0

  function handleFilter(type) {
    setActiveFilter(type)
  }

  function toggleExpand(itemId) {
    setExpandedItem(expandedItem === itemId ? null : itemId)
  }

  function generatePDF() {
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text('Relatório de Avisos - Workshop Connect', 14, 22)
    doc.setFontSize(11)
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 32)
    doc.text(`Filtros aplicados: ${activeFilterLabel}${searchTerm ? ` | Busca: "${searchTerm}"` : ''}`, 14, 40)

    const tableColumn = ['Título', 'Tipo', 'Data', 'Mensagem']
    const tableRows = []

    sortedAndFiltered.forEach(notice => {
      const noticeData = [
        notice.title,
        badgeMap[notice.type]?.label || 'Atualização',
        notice.createdAt.toLocaleDateString('pt-BR'),
        notice.message.length > 100 ? notice.message.substring(0, 100) + '...' : notice.message
      ]
      tableRows.push(noticeData)
    })

    doc.autoTable(tableColumn, tableRows, { startY: 50 })
    doc.save(`relatorio-avisos-${new Date().toISOString().split('T')[0]}.pdf`)
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

      <div className="notice-controls">
        <div className="search-container">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar avisos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="sort-container">
          <SortAsc size={16} className="sort-icon" />
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="sort-select"
          >
            <option value="newest">Mais Novo para mais Antigo</option>
            <option value="oldest">Mais Antigo para mais Novo</option>
            <option value="a-z">A-Z (Ordem alfabética)</option>
            <option value="date">Filtrar por Data Específica</option>
          </select>
        </div>

        {sortOption === 'date' && (
          <input
            type="date"
            value={specificDate}
            onChange={(e) => setSpecificDate(e.target.value)}
            className="date-input"
          />
        )}

        <button
          type="button"
          onClick={generatePDF}
          className="pdf-button"
          disabled={sortedAndFiltered.length === 0}
        >
          <Download size={16} />
          Gerar PDF
        </button>
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
            ? searchTerm
              ? `Nenhum aviso encontrado para "${searchTerm}".`
              : 'O mural está limpo no momento. Use o formulário acima para publicar o primeiro aviso.'
            : `Nenhum aviso encontrado para "${activeFilterLabel}". Tente outro filtro.`}
        </p>
      )}

      <ul className="notice-list">
        {sortedAndFiltered.map((item) => {
          const badge = badgeMap[item.type] ?? defaultBadge
          const Icon = badge.Icon
          const isExpanded = expandedItem === item.id

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
                <p className={`notice-message ${!isExpanded ? 'notice-message-truncated' : ''}`}>
                  {item.message}
                </p>
                {!isExpanded && (
                  <span className="notice-timestamp">
                    {formatRelativeDate(item.createdAt)}
                  </span>
                )}
                {isExpanded && (
                  <div className="notice-details">
                    <span className="notice-full-date">
                      Criado em: {item.createdAt.toLocaleDateString('pt-BR')} às {item.createdAt.toLocaleTimeString('pt-BR')}
                    </span>
                  </div>
                )}
                <div>
                  <button
                    type="button"
                    className="expand-button"
                    onClick={() => toggleExpand(item.id)}
                    aria-expanded={isExpanded}
                    aria-controls={`notice-details-${item.id}`}
                  >
                    {isExpanded ? 'Recolher' : 'Expandir'}
                  </button>
                  <button
                    type="button"
                    className="delete-button"
                    onClick={() => handleDelete(item.id)}
                    aria-label={`Excluir aviso: ${item.title}`}
                    title="Excluir este aviso"
                  >
                    🗑️ Excluir
                  </button>
                </div>
              </article>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
