import { useState } from 'react'
import { FiDollarSign } from 'react-icons/fi'
import { useCarrito } from '../context/CarritoContext.jsx'
import { formatearDinero, redondearDinero } from '../utils/dinero.js'

/**
 * RF039 — Selector de propina.
 *
 * Heurísticas de Nielsen:
 *   · Visibilidad del estado: total actualizado inmediatamente.
 *   · Control y libertad: elegir porcentaje, valor o ninguna.
 *   · Prevención de errores: validar rango de valor personalizado.
 *   · Coincidencia: opciones comunes en restaurantes (5%, 10%, 15%).
 */
const PORCENTAJES = [5, 10, 15]

function SelectorPropina() {
  const { propina, setPropina, total } = useCarrito()
  const [valorCustom, setValorCustom] = useState('')

  const handlePorcentaje = (pct) => {
    setPropina({ tipo: 'porcentaje', porcentaje: pct })
    setValorCustom('')
  }

  const handleCustom = () => {
    const valor = Number(valorCustom)
    if (!Number.isFinite(valor) || valor < 0) return
    setPropina({ tipo: 'personalizada', valor: redondearDinero(valor) })
  }

  const handleNinguna = () => {
    setPropina({ tipo: 'ninguna', valor: 0, porcentaje: 0 })
    setValorCustom('')
  }

  return (
    <div className="card mb-3" style={{ border: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderRadius: '8px' }}>
      <div className="card-body">
        <h6 className="mb-2">
          <FiDollarSign style={{ marginRight: '6px', color: '#1a3c34' }} />
          Propina
        </h6>

        <div className="row g-2 mb-2">
          {PORCENTAJES.map(pct => (
            <div key={pct} className="col-4">
              <button
                type="button"
                className="btn btn-sm w-100"
                style={{
                  backgroundColor: propina.tipo === 'porcentaje' && propina.porcentaje === pct ? '#1a3c34' : '#fff',
                  color: propina.tipo === 'porcentaje' && propina.porcentaje === pct ? '#fff' : '#1a3c34',
                  border: '1px solid #1a3c34'
                }}
                onClick={() => handlePorcentaje(pct)}
              >
                {pct}%
              </button>
            </div>
          ))}
        </div>

        <div className="input-group input-group-sm mb-2">
          <span className="input-group-text">$</span>
          <input
            type="number"
            className="form-control"
            placeholder="Otro valor"
            value={valorCustom}
            onChange={(e) => setValorCustom(e.target.value)}
            onBlur={handleCustom}
          />
        </div>

        <button
          type="button"
          className="btn btn-sm btn-outline-secondary w-100"
          onClick={handleNinguna}
        >
          Sin propina
        </button>

        {propina.valor > 0 && (
          <div className="d-flex justify-content-between align-items-center mt-2 p-2 bg-success-subtle rounded">
            <small className="text-success">
              <i className="fa-solid fa-check me-1"></i>
              Propina: {formatearDinero(propina.valor)}
              {propina.tipo === 'porcentaje' ? ` (${propina.porcentaje}%)` : ''}
            </small>
            <small className="text-muted">
              Total: {formatearDinero(total)}
            </small>
          </div>
        )}
      </div>
    </div>
  )
}

export default SelectorPropina
