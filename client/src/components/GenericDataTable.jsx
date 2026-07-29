import { FiSearch, FiChevronLeft, FiChevronRight } from 'react-icons/fi'

export default function GenericDataTable({ entity, columns, items, total, page, totalPages, onPageChange, onSearch, searchPlaceholder, onEdit, onDelete }) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{entity.charAt(0).toUpperCase() + entity.slice(1).replace('-', ' ')}</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]">{total} registros</span>
          </div>
          {onSearch && (
            <div className="relative">
              <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
              <input
                type="text"
                placeholder={searchPlaceholder || 'Buscar...'}
                onChange={e => onSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 w-72 transition-all"
              />
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[var(--color-border-default)] overflow-hidden bg-[var(--color-bg)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--color-bg-secondary)] text-left border-b border-[var(--color-border-default)]">
                {columns.map(col => (
                  <th key={col.key} className="px-5 py-3 font-semibold text-[var(--color-text-secondary)] text-xs uppercase tracking-wider whitespace-nowrap">{col.label}</th>
                ))}
                <th className="px-5 py-3 font-semibold text-[var(--color-text-secondary)] text-xs uppercase tracking-wider w-28 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-default)]">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-5 py-16 text-center">
                    <p className="text-[var(--color-text-secondary)] text-sm">No hay registros disponibles</p>
                  </td>
                </tr>
              ) : items.map((item, idx) => (
                <tr key={item.id} className="hover:bg-[var(--color-bg-secondary)]/50 transition-colors">
                  {columns.map(col => (
                    <td key={col.key} className="px-5 py-3.5 text-[var(--color-text-primary)] max-w-xs truncate">
                      {col.render ? col.render(item) : (
                        <span className="text-sm">{item[col.key] != null ? String(item[col.key]) : '—'}</span>
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-3.5">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => onEdit(item)} className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">Editar</button>
                      <button onClick={() => onDelete(item)} className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-5">
            <span className="text-xs text-[var(--color-text-secondary)]">
              Página {page} de {totalPages} &middot; {total} resultados
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
                className="p-2 rounded-lg border border-[var(--color-border-default)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] transition-colors">
                <FiChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                const p = start + i
                if (p > totalPages) return null
                return (
                  <button key={p} onClick={() => onPageChange(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                      p === page
                        ? 'bg-blue-600 text-white'
                        : 'border border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'
                    }`}>
                    {p}
                  </button>
                )
              })}
              <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
                className="p-2 rounded-lg border border-[var(--color-border-default)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] transition-colors">
                <FiChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
