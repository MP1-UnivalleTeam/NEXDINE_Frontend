import { useEffect, useState } from 'react'
import { FiBell, FiX } from 'react-icons/fi'
import { leerRecordatoriosLocales, recordatoriosPendientes, marcarEjecutados } from '../services/recordatorios.js'
import { colores, radios, sombras } from '../styles/tokens.js'

const INTERVALO_MS = 30000

/**
 * Dispara en pantalla los recordatorios guardados en este navegador.
 * Se monta junto al Sidebar, así funciona en cualquier vista administrativa.
 * Cuando el backend tenga su programador, este componente deja de ser necesario
 * para los recordatorios del servidor (que llegarán como notificación/correo).
 */
function AvisosRecordatorios() {
  const [avisos, setAvisos] = useState([])

  useEffect(() => {
    const revisar = () => {
      const pendientes = recordatoriosPendientes(leerRecordatoriosLocales())
      if (pendientes.length === 0) return
      marcarEjecutados(pendientes.map(r => r.id))
      setAvisos(prev => [...prev, ...pendientes.map(r => ({ id: `${r.id}-${Date.now()}`, titulo: r.titulo, mensaje: r.mensaje }))].slice(-4))
      if ('Notification' in window && Notification.permission === 'granted') {
        pendientes.forEach(r => {
          try { new Notification(`Recordatorio: ${r.titulo}`, { body: r.mensaje || '', tag: `recordatorio-${r.id}` }) } catch { /* sin soporte */ }
        })
      }
    }
    revisar()
    const temporizador = setInterval(revisar, INTERVALO_MS)
    window.addEventListener('nexdine-recordatorios', revisar)
    return () => {
      clearInterval(temporizador)
      window.removeEventListener('nexdine-recordatorios', revisar)
    }
  }, [])

  if (avisos.length === 0) return null

  return (
    <div aria-live="assertive" style={{
      position: 'fixed', bottom: '16px', right: '16px', left: '16px', zIndex: 1090,
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', pointerEvents: 'none'
    }}>
      {avisos.map(aviso => (
        <div key={aviso.id} role="alert" style={{
          pointerEvents: 'auto', maxWidth: '380px', width: '100%', backgroundColor: colores.tarjeta,
          borderLeft: `4px solid ${colores.advertencia}`, borderRadius: radios.md, boxShadow: sombras.nivel3,
          padding: '12px 14px', display: 'flex', gap: '10px', alignItems: 'flex-start'
        }}>
          <FiBell style={{ color: colores.advertencia, flexShrink: 0, marginTop: '3px' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <small style={{ color: colores.textoSuave, fontWeight: 700, textTransform: 'uppercase', fontSize: '10.5px', letterSpacing: '0.05em' }}>
              Recordatorio
            </small>
            <div style={{ fontWeight: 700, color: colores.texto }}>{aviso.titulo}</div>
            {aviso.mensaje && <div style={{ fontSize: '13px', color: colores.textoSuave }}>{aviso.mensaje}</div>}
          </div>
          <button type="button" aria-label="Descartar recordatorio"
            onClick={() => setAvisos(prev => prev.filter(a => a.id !== aviso.id))}
            style={{ border: 'none', background: 'transparent', color: colores.textoSuave, cursor: 'pointer', padding: 0 }}>
            <FiX />
          </button>
        </div>
      ))}
    </div>
  )
}

export default AvisosRecordatorios
