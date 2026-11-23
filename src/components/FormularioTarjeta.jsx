import { useState } from 'react'
import { FiCreditCard, FiLock } from 'react-icons/fi'
import { colores, radios, btnPrimario, input } from '../styles/tokens.js'

const soloDigitos = (valor) => String(valor ?? '').replace(/\D/g, '')

const formatearNumero = (valor) => soloDigitos(valor)
  .slice(0, 19)
  .replace(/(.{4})/g, '$1 ')
  .trim()

const formatearFecha = (valor) => {
  const digitos = soloDigitos(valor).slice(0, 4)
  if (digitos.length <= 2) return digitos
  return `${digitos.slice(0, 2)}/${digitos.slice(2)}`
}

function FormularioTarjeta({ onSolicitarCobro }) {
  const [numero, setNumero] = useState('')
  const [titular, setTitular] = useState('')
  const [fecha, setFecha] = useState('')
  const [cvc, setCvc] = useState('')
  const [error, setError] = useState('')

  const limpiar = () => {
    setNumero('')
    setTitular('')
    setFecha('')
    setCvc('')
  }

  const enviar = (event) => {
    event.preventDefault()
    const digitosNumero = soloDigitos(numero)
    const digitosFecha = soloDigitos(fecha)
    const digitosCvc = soloDigitos(cvc)
    if (digitosNumero.length < 13
      || !titular.trim()
      || digitosFecha.length !== 4
      || digitosCvc.length < 3) {
      setError('Completa los datos de la tarjeta.')
      return
    }
    setError('')
    limpiar()
    onSolicitarCobro?.()
  }

  const campo = {
    ...input,
    width: '100%',
    padding: '0 10px'
  }

  return (
    <form onSubmit={enviar} autoComplete="off" style={{
      marginTop: '12px', padding: '14px', borderRadius: radios.md,
      border: `1px solid ${colores.borde}`, backgroundColor: colores.superficie
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        color: colores.texto, fontWeight: 600, fontSize: '13px', marginBottom: '10px'
      }}>
        <FiCreditCard /> Datos de la tarjeta
      </div>

      {error && (
        <div role="alert" style={{
          backgroundColor: colores.errorFondo, color: colores.errorTexto,
          borderRadius: radios.sm, padding: '8px 10px', fontSize: '12px', marginBottom: '10px'
        }}>
          {error}
        </div>
      )}

      <div className="mb-2">
        <label htmlFor="tarjeta-numero" className="form-label small fw-semibold">Número de tarjeta</label>
        <input
          id="tarjeta-numero"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="0000 0000 0000 0000"
          value={numero}
          onChange={(event) => { setNumero(formatearNumero(event.target.value)); setError('') }}
          style={campo}
        />
      </div>

      <div className="mb-2">
        <label htmlFor="tarjeta-nombre" className="form-label small fw-semibold">Nombre</label>
        <input
          id="tarjeta-nombre"
          type="text"
          autoComplete="off"
          placeholder="Nombre del titular"
          value={titular}
          onChange={(event) => { setTitular(event.target.value); setError('') }}
          style={campo}
        />
      </div>

      <div className="row g-2 mb-2">
        <div className="col-6">
          <label htmlFor="tarjeta-fecha" className="form-label small fw-semibold">Fecha</label>
          <input
            id="tarjeta-fecha"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="MM/AA"
            value={fecha}
            onChange={(event) => { setFecha(formatearFecha(event.target.value)); setError('') }}
            style={campo}
          />
        </div>
        <div className="col-6">
          <label htmlFor="tarjeta-cvc" className="form-label small fw-semibold">CVC</label>
          <input
            id="tarjeta-cvc"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            placeholder="123"
            maxLength={4}
            value={cvc}
            onChange={(event) => { setCvc(soloDigitos(event.target.value).slice(0, 4)); setError('') }}
            style={campo}
          />
        </div>
      </div>

      <button type="submit" className="btn w-100" style={{ ...btnPrimario, minHeight: '42px', fontSize: '13px' }}>
        <FiLock style={{ marginRight: '6px' }} /> Cobrar tarjeta
      </button>

      <small style={{ display: 'block', color: colores.textoSuave, marginTop: '8px', fontSize: '11.5px' }}>
        Los datos no se guardan ni se envían desde este formulario.
      </small>
    </form>
  )
}

export default FormularioTarjeta
