import EntityView from './EntityView'

const ROLES = [
  { value: 'ESTUDIANTE', label: 'Estudiante' },
  { value: 'PROFESOR', label: 'Profesor' },
  { value: 'ADMIN', label: 'Administrador' }
]

const columns = [
  { key: 'nombre', label: 'Nombre' },
  { key: 'cedula', label: 'Cédula' },
  {
    key: 'role', label: 'Rol',
    render: (item) => {
      const style = item.role === 'ADMIN'
        ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
        : item.role === 'PROFESOR'
          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
      const label = item.role === 'ADMIN' ? 'Admin' : item.role === 'PROFESOR' ? 'Profesor' : 'Estudiante'
      return (
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${style}`}>
          {label}
        </span>
      )
    }
  },
  { key: 'carrera', label: 'Carrera', render: (item) => item.carrera || <span className="text-[var(--color-text-secondary)]">—</span> },
  { key: 'email', label: 'Email', render: (item) => item.email || <span className="text-[var(--color-text-secondary)]">—</span> }
]

const fields = [
  { key: 'nombre', label: 'Nombre completo', placeholder: 'Nombre completo' },
  { key: 'cedula', label: 'Cédula', type: 'cedula' },
  { key: 'password', label: 'Contraseña', placeholder: 'Mínimo 6 caracteres (default: 123456)', required: false },
  { key: 'role', label: 'Rol', type: 'select', options: ROLES },
  { key: 'carrera', label: 'Carrera', placeholder: 'Ej: Ingeniería Informática', required: false },
  { key: 'semestre', label: 'Semestre', placeholder: 'Ej: 3er Semestre', required: false },
  { key: 'email', label: 'Email', placeholder: 'correo@uneg.edu.ve', required: false },
  { key: 'telefono', label: 'Teléfono', placeholder: '0412-1234567', required: false }
]

export default function UsersView() {
  return (
    <EntityView
      entity="users"
      columns={columns}
      fields={fields}
      searchPlaceholder="Buscar por nombre, cédula o email..."
    />
  )
}
