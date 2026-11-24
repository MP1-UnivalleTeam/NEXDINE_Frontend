import { useCallback, useEffect, useRef, useState } from 'react'
import { FiBell, FiBellOff, FiCheck, FiX } from 'react-icons/fi'
import { obtenerResumenPedido } from '../services/pedidos.js'
import { etiquetaEstado, esEstadoFinal, normalizarEstado } from '../utils/pedidos.js'
import { colores, radios, tarjeta, btnGhost, sombras } from '../styles/tokens.js'

const PASOS = ['PENDIENTE', 'CONFIRMADO', 'EN_PREPARACION', 'LISTO', 'ENTREGADO']
const INTERVALO_MS = 15000
const CLAVE_PREFERENCIA = 'nexdine.notificacionesPedido'

const MENSAJES = {
  CONFIRMADO: 'El restaurante confirmó tu pedido.',
  EN_PREPARACION: 'Tu pedido se está preparando.',
  LISTO: '¡Tu pedido está listo!',
  ENTREGADO: 'Tu pedido fue entregado. ¡Buen provecho!',
  CANCELADO: 'Tu pedido fue cancelado. Comunícate con el restaurante si tienes dudas.'
}

function soportaNotificaciones() {
  return typeof window !== 'undefined' && 'Notification' in window
}

function leerPreferencia() {
  try { return localStorage.getItem(CLAVE_PREFERENCIA) !== 'off' } catch { return true }
}

function guardarPreferencia(activa) {
  try { localStorage.setItem(CLAVE_PREFERENCIA, activa ? 'on' : 'off') } catch { /* sin almacenamiento */ }
}

/**
 * Seguimiento en vivo del estado del pedido para el cliente.
 *
 * Consulta el pedido cada 15 s mientras no esté finalizado y, cuando el
 * estado cambia, muestra un aviso en pantalla y (si el usuario lo permite)
 * una notificación del navegador.
 *
 * PENDIENTE BACKEND: notificaciones fuera de la página (correo, SMS/WhatsApp
 * o Web Push) requieren que el servidor las envíe al cambiar el estado.
 */
function SeguimientoEstadoPedido({ resumen, onActualizado }) {
  const [avisos, setAvisos] = useState([])
  const [activas, setActivas] = useState(leerPreferencia)
  const [permiso, setPermiso] = useState(soportaNotificaciones() ? Notification.permission : 'unsupported')
  const estadoAnterior = useRef(normalizarEstado(resumen?.estado))
  const pedidoId = resumen?.id
  const estadoActual = normalizarEstado(resumen?.estado)

  const notificar = useCallback((estado, numero) => {
    const texto = MENSAJES[estado] || `Tu pedido ahora está: ${etiquetaEstado(estado)}.`
    const id = `${Date.now()}-${estado}`
    setAvisos(prev => [...prev.slice(-2), { id, estado, texto }])
    setTimeout(() => setAvisos(prev => prev.filter(a => a.id !== id)), 8000)

    if (!activas) return
    if (navigator.vibrate) navigator.vibrate([120, 60, 120])
    if (soportaNotificaciones() && Notification.permission === 'granted') {
      try {
        new Notification(`Pedido ${numero || ''}`.trim(), { body: texto, tag: `pedido-${pedidoId}` })
      } catch {
        // Algunos navegadores móviles solo permiten notificaciones desde un service worker.
      }
    }
  }, [activas, pedidoId])

  // Detecta cambios de estado recibidos por la consulta periódica.
  useEffect(() => {
    if (!estadoActual) return
    if (estadoAnterior.current && estadoAnterior.current !== estadoActual) {
      notificar(estadoActual, resumen?.numeroSeguimiento)
    }
    estadoAnterior.current = estadoActual
  }, [estadoActual, notificar, resumen?.numeroSeguimiento])

  // Consulta periódica mientras el pedido siga en curso.
  useEffect(() => {
    if (!pedidoId || esEstadoFinal(estadoActual)) return
    const temporizador = setInterval(async () => {
      if (document.hidden && permiso !== 'granted') return
      try {
        const datos = await obtenerResumenPedido(pedidoId)
        if (datos?.id) onActualizado(datos)
      } catch {
        // Error transitorio: se reintenta en el siguiente ciclo.
      }
    }, INTERVALO_MS)
    return () => clearInterval(temporizador)
  }, [pedidoId, estadoActual, onActualizado, permiso])

  const alternarNotificaciones = async () => {
    if (activas) {
      setActivas(false)
      guardarPreferencia(false)
      return
    }
    setActivas(true)
    guardarPreferencia(true)
    if (soportaNotificaciones() && Notification.permission === 'default') {
      const resultado = await Notification.requestPermission()
      setPermiso(resultado)
    }
  }

  const cancelado = estadoActual === 'CANCELADO'
  const indiceActual = PASOS.indexOf(estadoActual)

  return (
    <section aria-label="Seguimiento del pedido" style={{ ...tarjeta, padding: '16px 18px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <div>
          <strong style={{ color: colores.texto }}>Estado de tu pedido</strong>
          <small style={{ display: 'block', color: colores.textoSuave }}>
            {esEstadoFinal(estadoActual)
              ? 'El seguimiento terminó.'
              : 'Se actualiza automáticamente cada 15 segundos.'}
          </small>
        </div>
        {!esEstadoFinal(estadoActual) && (
          <button type="button" className="btn" onClick={alternarNotificaciones}
            style={{ ...btnGhost, minHeight: '38px', fontSize: '13px' }}
            aria-pressed={activas}>
            {activas ? <FiBell style={{ marginRight: '6px' }} /> : <FiBellOff style={{ marginRight: '6px' }} />}
            {activas ? 'Notificaciones activadas' : 'Activar notificaciones'}
          </button>
        )}
      </div>

      {activas && permiso === 'denied' && (
        <small style={{ display: 'block', color: colores.advertenciaTexto, marginBottom: '10px' }}>
          El navegador bloqueó las notificaciones; verás los avisos solo dentro de esta página.
        </small>
      )}

      {cancelado ? (
        <div style={{ backgroundColor: colores.errorFondo, color: colores.errorTexto, borderRadius: radios.sm, padding: '10px 12px', fontSize: '13px' }}>
          {MENSAJES.CANCELADO}
        </div>
      ) : (
        <ol style={{ display: 'flex', listStyle: 'none', padding: 0, margin: 0, gap: '4px' }}>
          {PASOS.map((paso, i) => {
            const completado = indiceActual >= i
            const actual = indiceActual === i
            return (
              <li key={paso} style={{ flex: 1, minWidth: 0, textAlign: 'center' }} aria-current={actual ? 'step' : undefined}>
                <div style={{
                  height: '6px', borderRadius: radios.full, marginBottom: '8px',
                  backgroundColor: completado ? colores.exito : colores.borde
                }} />
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '22px', height: '22px', borderRadius: '50%', fontSize: '11px', fontWeight: 700,
                  backgroundColor: completado ? colores.primario : colores.superficie,
                  color: completado ? 'white' : colores.textoSuave
                }}>
                  {completado && !actual ? <FiCheck size={12} /> : i + 1}
                </span>
                <small style={{
                  display: 'block', marginTop: '4px', fontSize: '11.5px', lineHeight: 1.2,
                  color: actual ? colores.texto : colores.textoSuave, fontWeight: actual ? 700 : 500
                }}>
                  {etiquetaEstado(paso)}
                </small>
              </li>
            )
          })}
        </ol>
      )}

      {/* Avisos emergentes */}
      <div aria-live="polite" style={{
        position: 'fixed', top: '16px', right: '16px', left: '16px', zIndex: 1080,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', pointerEvents: 'none'
      }}>
        {avisos.map(aviso => (
          <div key={aviso.id} role="status" style={{
            pointerEvents: 'auto', maxWidth: '360px', width: '100%',
            backgroundColor: aviso.estado === 'CANCELADO' ? colores.errorFondo : colores.primario,
            color: aviso.estado === 'CANCELADO' ? colores.errorTexto : 'white',
            borderRadius: radios.md, padding: '12px 14px', boxShadow: sombras.nivel3,
            display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '14px'
          }}>
            <FiBell style={{ flexShrink: 0, marginTop: '3px' }} />
            <div style={{ flex: 1 }}>
              <strong style={{ display: 'block' }}>{etiquetaEstado(aviso.estado)}</strong>
              {aviso.texto}
            </div>
            <button type="button" aria-label="Cerrar aviso"
              onClick={() => setAvisos(prev => prev.filter(a => a.id !== aviso.id))}
              style={{ border: 'none', background: 'transparent', color: 'inherit', cursor: 'pointer', padding: 0 }}>
              <FiX />
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

export default SeguimientoEstadoPedido
