import { useSocket } from '../contexts/SocketContext'

export default function OfflineBanner() {
  const { connected } = useSocket()

  if (connected) return null

  return (
    <div className="bg-yellow-500 text-white text-xs text-center py-1.5 px-4 flex items-center justify-center gap-2">
      <span>⚠</span>
      <span>Sin conexión al servidor — modo solo lectura. Las funciones interactivas requieren conexión.</span>
    </div>
  )
}
