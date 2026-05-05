// src/components/NoticeForm.jsx
import { useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { Clock, Edit3, MessageSquare, Send, Tag, Trash2 } from 'lucide-react'
import { db } from '../firebase.config'
import './NoticeForm.css'

export function NoticeForm() {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState('update')
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const maxMessageLength = 500
  const remainingChars = maxMessageLength - message.length
  const isNearLimit = remainingChars <= 50

  function handleReset() {
    setTitle('')
    setMessage('')
    setType('update')
    setSuccessMessage('')
    setErrorMessage('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSuccessMessage('')
    setErrorMessage('')

    if (!title.trim()) {
      setErrorMessage('Por favor, insira um título para o aviso.')
      return
    }

    if (!message.trim()) {
      setErrorMessage('Por favor, insira uma mensagem para o aviso.')
      return
    }

    setSubmitting(true)

    try {
      const noticesRef = collection(db, 'noticeBoard')
      await addDoc(noticesRef, {
        title: title.trim(),
        message: message.trim(),
        type,
        createdAt: serverTimestamp(),
      })

      setSuccessMessage('Aviso enviado com sucesso!')
      setTitle('')
      setMessage('')
      setType('update')
    } catch (error) {
      console.error('Erro ao enviar aviso:', error)
      setErrorMessage('Ocorreu um erro ao enviar o aviso. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section aria-labelledby="form-title" className="notice-form-section">
      <header>
        <h2 id="form-title">Cadastrar Novo Aviso</h2>
        <p>Preencha o formulário abaixo para criar e publicar um novo aviso no mural.</p>
      </header>

      {successMessage && (
        <p role="status" aria-live="polite" className="success-message">
          ✓ {successMessage}
        </p>
      )}

      {errorMessage && (
        <p role="alert" aria-live="assertive" className="error-message">
          ✕ {errorMessage}
        </p>
      )}

      <form onSubmit={handleSubmit} className="notice-form" noValidate>
        <fieldset>
          <legend className="sr-only">Formulário de novo aviso</legend>

          {/* Campo Título */}
          <div className="form-group">
            <label htmlFor="notice-title" className="label-with-icon">
              <Edit3 size={14} className="label-icon" />
              Título <span aria-label="obrigatório">*</span>
            </label>
            <input
              id="notice-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Manutenção agendada"
              disabled={submitting}
              maxLength={100}
              required
              aria-required="true"
            />
          </div>

          {/* Campo Mensagem */}
          <div className="form-group">
            <label htmlFor="notice-message" className="label-with-icon">
              <MessageSquare size={14} className="label-icon" />
              Mensagem <span aria-label="obrigatório">*</span>
            </label>
            <textarea
              id="notice-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Descreva o aviso em detalhes..."
              disabled={submitting}
              rows={5}
              maxLength={maxMessageLength}
              required
              aria-required="true"
            />
            <div
              className={`char-counter ${isNearLimit ? 'char-counter-warning' : ''}`}
              aria-live="polite"
            >
              {remainingChars} caracteres restantes
            </div>
          </div>

          {/* Campo Tipo de Aviso */}
          <div className="form-group">
            <label htmlFor="notice-type" className="label-with-icon">
              <Tag size={14} className="label-icon" />
              Tipo de Aviso
            </label>
            <select
              id="notice-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              disabled={submitting}
            >
              <option value="update">Atualização</option>
              <option value="alert">Alerta</option>
              <option value="promotion">Promoção</option>
              <option value="safety">Segurança</option>
              <option value="schedule">Funcionamento</option>
              <option value="tip">Dica</option>
              <option value="team">Equipe</option>
            </select>
          </div>

          {/* Botões */}
          <div className="form-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={handleReset}
              disabled={submitting}
            >
              <Trash2 size={16} className="button-icon" />
              Limpar
            </button>
            <button
              type="submit"
              disabled={submitting}
              aria-busy={submitting}
            >
              <Send size={16} className="button-icon" />
              {submitting ? 'Enviando...' : 'Enviar Aviso'}
            </button>
          </div>
        </fieldset>
      </form>
    </section>
  )
}
