import { useState } from 'react'
import { FiTag, FiX, FiCheck } from 'react-icons/fi'
import { validarCupon } from '../services/pedidos.js'
import { useCarrito } from '../context/CarritoContext.jsx'

/**
 * RF036 — Aplicar cupón de descuento.
 *
 * Heurísticas de Nielsen:
 *   · Visibilidad del estado: loading, éxito y error claros.
 *   · Prevención de errores: no se puede aplicar un cupón vacío.
 *   · Control y libertad: se puede retirar el cupón aplicado.
 *   · Reconocimiento: muestra el código aplicado y el descuento.
 */
function CuponDescuento() {
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { cupon, aplicarCupon, quitarCupon } = useCarrito()

  const handleAplicar = async () => {
    if (!codigo.trim()) {
      setError('Ingrese un código de cupón')
      return
    }

    setLoading(true)
    setError('')

    try {
      await validarCupon(codigo.trim())
      aplicarCupon(codigo.trim())
      setCodigo('')
    } catch (err) {
      setError(err.response?.data?.error || 'Cupón inválido o expirado')
    } finally {
      setLoading(false)
    }
  }

  const handleRetirar = () => {
    quitarCupon()
    setError('')
  }

  return (
    <div className="card mb-3" style={{ border: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderRadius: '8px' }}>
      <div className="card-body">
        <h6 className="mb-2">
          <FiTag style={{ marginRight: '6px', color: '#1a3c34' }} />
          Cupón de descuento
        </h6>

        {cupon ? (
          <div className="d-flex align-items-center justify-content-between p-2 bg-success-subtle rounded">
            <div>
              <span className="badge bg-success me-2">
                <FiCheck style={{ marginRight: '4px' }} />{cupon.codigo}
              </span>
              <small className="text-muted">
                {cupon.descuento > 0
                  ? `Descuento: $${cupon.descuento.toLocaleString('es-CO')}`
                  : 'Cupón aplicado'}
              </small>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={handleRetirar}
            >
              <FiX style={{ marginRight: '4px' }} /> Retirar
            </button>
          </div>
        ) : (
          <>
            <div className="input-group">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Código de cupón"
                value={codigo}
                onChange={(e) => { setCodigo(e.target.value.toUpperCase()); setError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleAplicar()}
              />
              <button
                type="button"
                className="btn btn-sm"
                style={{ backgroundColor: '#1a3c34', color: 'white' }}
                onClick={handleAplicar}
                disabled={loading}
              >
                {loading ? 'Aplicando...' : 'Aplicar'}
              </button>
            </div>
            {error && (
              <small className="text-danger d-block mt-2">
                <i className="fa-solid fa-circle-exclamation me-1"></i>{error}
              </small>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default CuponDescuento
