import { useCallback, useEffect, useRef, useState } from 'react'
import { API_URL } from '../services/api.js'
import { listarPedidosActivos } from '../services/pedidos.js'

const INTERVALO_RESPALDO_MS = 15000

export function usePedidosActivos({ activo = true } = {}) {
  const [pedidos, setPedidos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [enTiempoReal, setEnTiempoReal] = useState(false)
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null)
  const montado = useRef(true)

  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
    }
  }, [])

  const cargar = useCallback(async ({ silencioso = false } = {}) => {
    if (!silencioso) setCargando(true)
    try {
      const datos = await listarPedidosActivos()
      if (!montado.current) return
      setPedidos(Array.isArray(datos) ? datos : [])
      setError('')
      setUltimaActualizacion(new Date())
    } catch (err) {
      if (!montado.current) return
      const estado = err.response?.status
      if (estado === 401) {
        setError('Tu sesión expiró. Inicia sesión nuevamente.')
      } else if (estado === 403) {
        setError(err.response?.data?.error || 'No tienes permisos para consultar pedidos.')
      } else {
        setError('No se pudieron cargar los pedidos activos.')
      }
    } finally {
      if (montado.current) setCargando(false)
    }
  }, [])

  useEffect(() => {
    if (!activo) return undefined
    if (typeof EventSource === 'undefined') return undefined

    const fuente = new EventSource(`${API_URL}/api/pedidos/activos/eventos`, {
      withCredentials: true
    })

    fuente.onopen = () => setEnTiempoReal(true)
    fuente.onerror = () => setEnTiempoReal(false)
    fuente.addEventListener('pedido-actualizado', () => {
      cargar({ silencioso: true })
    })

    return () => {
      fuente.close()
      setEnTiempoReal(false)
    }
  }, [activo, cargar])

  useEffect(() => {
    if (!activo) return undefined

    cargar()
    const intervalo = setInterval(() => cargar({ silencioso: true }), INTERVALO_RESPALDO_MS)
    return () => clearInterval(intervalo)
  }, [activo, cargar])

  return {
    pedidos,
    cargando,
    error,
    enTiempoReal,
    ultimaActualizacion,
    recargar: () => cargar({ silencioso: true })
  }
}
