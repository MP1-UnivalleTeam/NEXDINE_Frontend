import { useEffect, useRef, useState } from 'react'
import { FiAlertTriangle, FiX, FiXCircle } from 'react-icons/fi'
import { colores, sombras, radios, tarjeta, btnGhost, input } from '../styles/tokens.js'

const MOTIVOS_RAPIDOS = [
  'El cliente lo solicitó',
  'Producto agotado',
  'Error al registrar el pedido',
  'Pago no recibido'
]
const MIN = 5
const MAX = 300

/**
 * RF009 + RF033: confirma la cancelación de un pedido y exige el motivo.
 * `onConfirmar(motivo)` debe devolver una promesa; si falla, el error se
 * muestra aquí y el modal sigue abierto.
 */
function ModalCancelarPedido({
  pedido, onConfirmar, onCerrar, pagado = false, motivosRapidos = MOTIVOS_RAPIDOS,
  avisoPago = 'Este pedido tiene un pago registrado. Después de cancelarlo, registra el reembolso en el módulo Reembolsos.'
}) {
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const campo = useRef(null)

  useEffect(() => {
    campo.current?.focus()
    const escape = (e) => {
      if (e.key === 'Escape' && !enviando) {
        e.stopPropagation()
        onCerrar()
      }
    }
    window.addEventListener('keydown', escape, true)
    return () => window.removeEventListener('keydown', escape, true)
  }, [onCerrar, enviando])

  const limpio = motivo.trim().replace(/\s+/g, ' ')

  const confirmar = async (e) => {
    e.preventDefault()
    if (limpio.length < MIN) {
      setError(`Escribe el motivo de la anulación (mínimo ${MIN} caracteres).`)
      return
    }
    setError('')
    setEnviando(true)
    try {
      await onConfirmar(limpio)
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'No fue posible cancelar el pedido.')
      setEnviando(false)
    }
  }

  return (
    <>
      <div onClick={() => !enviando && onCerrar()} style={{ position: 'fixed', inset: 0, backgroundColor: sombras.backdrop, backdropFilter: 'blur(4px)', zIndex: 1060 }} />
      <div className="modal show" style={{ display: 'block', zIndex: 1070 }} role="dialog" aria-modal="true" aria-labelledby="titulo-cancelar">
        <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '480px' }}>
          <form onSubmit={confirmar} style={{ ...tarjeta, boxShadow: sombras.nivel3, overflow: 'hidden', width: '100%' }}>
            <div style={{ padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${colores.borde}` }}>
              <h5 id="titulo-cancelar" style={{ margin: 0, fontWeight: 700, color: colores.texto }}>
                Cancelar pedido {pedido?.numeroSeguimiento || ''}
              </h5>
              <button type="button" aria-label="Cerrar" onClick={onCerrar} disabled={enviando} style={{ border: 'none', background: 'transparent', color: colores.textoSuave, fontSize: '20px', cursor: 'pointer' }}>
                <FiX />
              </button>
            </div>

            <div style={{ padding: '18px 22px' }}>
              <p style={{ color: colores.textoSuave, fontSize: '13.5px', marginTop: 0 }}>
                Solo se pueden cancelar pedidos que todavía no pasaron a preparación. Esta acción no se puede deshacer.
              </p>

              {pagado && (
                <div role="note" style={{ backgroundColor: colores.advertenciaFondo, color: colores.advertenciaTexto, borderRadius: radios.sm, padding: '10px 12px', fontSize: '13px', marginBottom: '14px', display: 'flex', gap: '8px' }}>
                  <FiAlertTriangle style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{avisoPago}</span>
                </div>
              )}

              <label htmlFor="motivo-cancelacion" style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: colores.texto, marginBottom: '6px' }}>
                Motivo de la anulación *
              </label>
              {motivosRapidos.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                  {motivosRapidos.map(m => (
                    <button key={m} type="button" onClick={() => setMotivo(m)} aria-pressed={limpio === m} style={{
                      minHeight: '32px', padding: '0 10px', borderRadius: radios.full, fontSize: '12.5px', fontWeight: 600, cursor: 'pointer',
                      border: `1px solid ${limpio === m ? colores.primario : colores.borde}`,
                      backgroundColor: limpio === m ? colores.mint : colores.tarjeta, color: colores.texto
                    }}>
                      {m}
                    </button>
                  ))}
                </div>
              )}
              <textarea
                id="motivo-cancelacion"
                ref={campo}
                rows={3}
                maxLength={MAX}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej.: el cliente cambió de opinión"
                aria-describedby="motivo-contador"
                style={{ ...input, height: 'auto', width: '100%', padding: '10px 12px' }}
              />
              <small id="motivo-contador" style={{ color: colores.textoSuave, display: 'block', textAlign: 'right' }}>
                {limpio.length}/{MAX}
              </small>

              {error && (
                <div role="alert" style={{ marginTop: '10px', backgroundColor: colores.errorFondo, color: colores.errorTexto, borderRadius: radios.sm, padding: '10px 12px', fontSize: '13px' }}>
                  {error}
                </div>
              )}
            </div>

            <div style={{ borderTop: `1px solid ${colores.borde}`, backgroundColor: colores.superficie, padding: '14px 22px', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
              <button type="button" className="btn" onClick={onCerrar} disabled={enviando} style={{ ...btnGhost, minHeight: '44px' }}>
                Volver
              </button>
              <button type="submit" className="btn" disabled={enviando} style={{
                minHeight: '44px', borderRadius: radios.sm, fontWeight: 600,
                backgroundColor: colores.error, borderColor: colores.error, color: '#fff'
              }}>
                <FiXCircle style={{ marginRight: '6px' }} />
                {enviando ? 'Cancelando…' : 'Cancelar pedido'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

export default ModalCancelarPedido
