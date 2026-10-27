import { useEffect, useState } from 'react'
import { FiTag, FiX, FiCheck } from 'react-icons/fi'
import { validarCupon } from '../services/pedidos.js'
import { obtenerMensajeError } from '../services/mensajes.js'
import { useCarrito } from '../context/CarritoContext.jsx'
import { formatearDinero } from '../utils/dinero.js'
import { colores, tarjeta } from '../styles/tokens.js'

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
  const [intentoValidacion, setIntentoValidacion] = useState(0)
  const { cupon, aplicarCupon, quitarCupon, subtotal } = useCarrito()

  const montoMinimoNoAlcanzado = Boolean(
    cupon?.montoMinimo && Number(cupon.montoMinimo) > subtotal
  )

  useEffect(() => {
    if (!cupon?.codigo) return undefined

    let vigente = true
    setError('')
    validarCupon(cupon.codigo, subtotal)
      .then(data => {
        if (!vigente) return
        aplicarCupon({
          codigo: data.codigo || cupon.codigo,
          tipo: data.tipo,
          valor: data.valor,
          montoMinimo: data.montoMinimo,
          descuento: data.descuento
        })
      })
      .catch(err => {
        if (!vigente) return
        if ([400, 404].includes(err.response?.status)) {
          quitarCupon()
        }
        setError(obtenerMensajeError(err, 'El cupón ya no está disponible.'))
      })

    return () => { vigente = false }
  }, [cupon?.codigo, subtotal, intentoValidacion, aplicarCupon, quitarCupon])

  const handleAplicar = async () => {
    if (loading) return
    if (!codigo.trim()) {
      setError('Ingrese un código de cupón')
      return
    }

    setLoading(true)
    setError('')

    try {
      const data = await validarCupon(codigo.trim(), subtotal)
      aplicarCupon({
        codigo: data.codigo || codigo.trim().toUpperCase(),
        tipo: data.tipo,
        valor: data.valor,
        montoMinimo: data.montoMinimo,
        descuento: data.descuento
      })
      setCodigo('')
    } catch (err) {
      setError(obtenerMensajeError(err, 'Cupón inválido o expirado.'))
    } finally {
      setLoading(false)
    }
  }

  const handleRetirar = () => {
    quitarCupon()
    setError('')
  }

  return (
    <div className="card mb-3" style={{ border: tarjeta.border, borderRadius: tarjeta.borderRadius, backgroundColor: tarjeta.background, boxShadow: tarjeta.boxShadow }}>
      <div className="card-body">
        <h6 className="mb-2">
          <FiTag style={{ marginRight: '6px', color: colores.primario }} />
          Cupón de descuento
        </h6>

        {cupon ? (
          <div className="p-2 bg-success-subtle rounded">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <span className="badge bg-success me-2">
                  <FiCheck style={{ marginRight: '4px' }} />{cupon.codigo}
                </span>
                <small className="text-muted">
                  {cupon.descuento > 0
                    ? `Descuento: ${formatearDinero(cupon.descuento)}`
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
            {montoMinimoNoAlcanzado && (
              <small className="text-danger d-block mt-2">
                <i className="fa-solid fa-circle-exclamation me-1"></i>
                El subtotal mínimo para este cupón es {formatearDinero(cupon.montoMinimo)}.
              </small>
            )}
            {error && (
              <div className="d-flex align-items-center justify-content-between gap-2 mt-2">
                <small className="text-danger" role="alert">{error}</small>
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0"
                  onClick={() => setIntentoValidacion(intento => intento + 1)}
                >
                  Reintentar
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="input-group">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Código de cupón"
                maxLength={50}
                value={codigo}
                onChange={(e) => { setCodigo(e.target.value.toUpperCase()); setError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleAplicar()}
              />
              <button
                type="button"
                className="btn btn-sm"
                style={{ backgroundColor: colores.primario, color: 'white' }}
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
