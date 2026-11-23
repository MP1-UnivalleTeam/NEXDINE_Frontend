import { FiX } from 'react-icons/fi'
import PagoPedido from './PagoPedido.jsx'
import { colores, sombras, radios, tarjeta, btnGhost } from '../styles/tokens.js'

/**
 * Modal de pago para el panel operativo. Reutiliza PagoPedido, que consulta
 * y modifica el pago real.
 */
function ModalPago({ pedido, rol, onCerrar, onPagado }) {
  if (!pedido) return null

  return (
    <>
      <div onClick={onCerrar} style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        backgroundColor: sombras.backdrop, backdropFilter: 'blur(4px)', zIndex: 1040
      }} />
      <div className="modal show" style={{ display: 'block', zIndex: 1050 }} tabIndex="-1" role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '560px' }}>
          <div style={{ ...tarjeta, boxShadow: sombras.nivel3, overflow: 'hidden' }}>
            <div style={{
              padding: '18px 22px', borderBottom: `1px solid ${colores.borde}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px'
            }}>
              <div>
                <h5 style={{ margin: 0, fontWeight: 700, color: colores.texto }}>Gestionar pago</h5>
                <small style={{ color: colores.textoSuave }}>
                  {pedido.numeroSeguimiento || pedido.id}
                  {pedido.nombre ? ` · ${pedido.nombre}` : ''}
                </small>
              </div>
              <button type="button" onClick={onCerrar} aria-label="Cerrar" style={{
                border: 'none', background: 'transparent', color: colores.textoSuave,
                cursor: 'pointer', fontSize: '20px', padding: '4px'
              }}>
                <FiX />
              </button>
            </div>

            <div style={{ padding: '16px 22px', maxHeight: '70vh', overflowY: 'auto' }}>
              <PagoPedido pedido={pedido} rol={rol} onPagado={onPagado} compacto />
            </div>

            <div style={{
              borderTop: `1px solid ${colores.borde}`, backgroundColor: colores.superficie,
              padding: '12px 22px', display: 'flex', justifyContent: 'flex-end', gap: '10px'
            }}>
              <button type="button" className="btn" onClick={onCerrar} style={{ ...btnGhost, minHeight: '42px', borderRadius: radios.sm }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default ModalPago
