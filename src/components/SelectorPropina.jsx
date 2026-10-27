import { useState } from 'react'
import { FiDollarSign, FiCheckCircle } from 'react-icons/fi'
import { useCarrito } from '../context/CarritoContext.jsx'
import { formatearDinero, redondearDinero } from '../utils/dinero.js'
import { colores, tarjeta } from '../styles/tokens.js'

const PORCENTAJES = [5, 10, 15]

function SelectorPropina() {
  const { propina, setPropina, total } = useCarrito()
  const [valorCustom, setValorCustom] = useState('')
  const [errorValor, setErrorValor] = useState('')

  const handlePorcentaje = (pct) => {
    setPropina({ tipo: 'porcentaje', porcentaje: pct })
    setValorCustom('')
    setErrorValor('')
  }

  const aplicarPersonalizada = () => {
    const texto = valorCustom.trim()
    if (!texto) {
      setErrorValor('Ingresa un valor de propina.')
      return
    }
    const valor = Number(texto)
    if (!Number.isFinite(valor) || valor < 0) {
      setErrorValor('El valor debe ser un número mayor o igual a 0.')
      return
    }
    setErrorValor('')
    setPropina({ tipo: 'personalizada', valor: redondearDinero(valor) })
  }

  const handleNinguna = () => {
    setPropina({ tipo: 'ninguna', valor: 0, porcentaje: 0 })
    setValorCustom('')
    setErrorValor('')
  }

  return (
    <div className="card mb-3" style={{ border: tarjeta.border, borderRadius: tarjeta.borderRadius, backgroundColor: tarjeta.background, boxShadow: tarjeta.boxShadow }}>
      <div className="card-body">
        <h6 className="mb-2">
          <FiDollarSign style={{ marginRight: '6px', color: colores.primario }} />
          Propina
        </h6>

        <div className="row g-2 mb-2">
          {PORCENTAJES.map(pct => (
            <div key={pct} className="col-4">
              <button
                type="button"
                className="btn btn-sm w-100"
                style={{
                  backgroundColor: propina.tipo === 'porcentaje' && propina.porcentaje === pct ? colores.primario : colores.tarjeta,
                  color: propina.tipo === 'porcentaje' && propina.porcentaje === pct ? '#fff' : colores.primario,
                  border: `1px solid ${colores.primario}`
                }}
                onClick={() => handlePorcentaje(pct)}
              >
                {pct}%
              </button>
            </div>
          ))}
        </div>

        <div className="input-group input-group-sm mb-1">
          <span className="input-group-text">$</span>
          <input
            type="number"
            className="form-control"
            placeholder="Otro valor"
            min="0"
            step="100"
            value={valorCustom}
            onChange={(e) => {
              setValorCustom(e.target.value)
              setErrorValor('')
            }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              aplicarPersonalizada()
            }}
            aria-label="Valor de propina personalizado"
            aria-invalid={Boolean(errorValor)}
            aria-describedby={errorValor ? 'error-propina' : undefined}
          />
          <button type="button" className="btn btn-outline-secondary" onClick={aplicarPersonalizada}>
            Aplicar
          </button>
        </div>

        {errorValor && (
          <div id="error-propina" role="alert" className="small mb-2" style={{ color: colores.errorTexto }}>
            {errorValor}
          </div>
        )}

        <button
          type="button"
          className="btn btn-sm btn-outline-secondary w-100"
          onClick={handleNinguna}
        >
          Sin propina
        </button>

        <div className="d-flex justify-content-between align-items-center mt-2 p-2" style={{
          backgroundColor: colores.superficie,
          borderRadius: tarjeta.borderRadius
        }}>
          <small style={{ color: propina.valor > 0 ? colores.exitoTexto : colores.textoSuave }}>
            {propina.valor > 0 && <FiCheckCircle style={{ marginRight: '4px' }} />}
            Propina: {formatearDinero(propina.valor)}
            {propina.tipo === 'porcentaje' && propina.porcentaje > 0 ? ` (${propina.porcentaje}%)` : ''}
          </small>
          <small style={{ color: colores.textoSuave }}>
            Total: {formatearDinero(total)}
          </small>
        </div>
      </div>
    </div>
  )
}

export default SelectorPropina
