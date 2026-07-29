import { useState } from 'react'
import { FiX, FiSave } from 'react-icons/fi'

export default function GenericFormModal({ title, fields, initialData, onSave, onClose, saving }) {
  const [form, setForm] = useState(initialData || {})

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[var(--color-bg)] border border-[var(--color-border-default)] rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-default)]">
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] transition-colors">
            <FiX size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {fields.map(field => (
            <div key={field.key}>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wide">{field.label}</label>
              {field.render ? field.render(form, handleChange) : field.type === 'select' ? (
                <select
                  value={form[field.key] || ''}
                  onChange={e => handleChange(field.key, e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                  required={field.required !== false}
                >
                  <option value="">Seleccionar...</option>
                  {field.options?.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : field.type === 'cedula' ? (
                <div className="flex">
                  <span className="flex items-center justify-center px-4 py-2.5 text-sm font-semibold rounded-l-xl border border-r-0 border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]">
                    V-
                  </span>
                  <input
                    type="text"
                    value={form[field.key] ? String(form[field.key]).replace(/^V-/, '') : ''}
                    onChange={e => {
                      const nums = e.target.value.replace(/[^0-9]/g, '')
                      handleChange(field.key, nums ? 'V-' + nums : '')
                    }}
                    onFocus={e => { if (!form[field.key]) handleChange(field.key, 'V-') }}
                    placeholder="12345678"
                    className="flex-1 px-4 py-2.5 text-sm rounded-r-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                    required={field.required !== false}
                  />
                </div>
              ) : (
                <input
                  type={field.type || 'text'}
                  value={form[field.key] || ''}
                  onChange={e => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                  required={field.required !== false}
                />
              )}
            </div>
          ))}

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--color-border-default)]">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-[var(--color-border-default)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)] transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-blue-900/20">
              <FiSave size={15} />
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
