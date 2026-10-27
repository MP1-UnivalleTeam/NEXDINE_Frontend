import { formatearNumeroSinDecimales, normalizarValorMoneda } from '../utils/dinero.js'

export default function MoneyInput({ value, onChange, name, placeholder = '0', style, className, inputMode = 'numeric', ...props }) {
  const valorVisual = (() => {
    const limpio = normalizarValorMoneda(value)
    if (limpio === '') return '$'
    return `$${formatearNumeroSinDecimales(limpio)}`
  })()

  const manejarCambio = (evento) => {
    const limpio = normalizarValorMoneda(evento.target.value)
    if (onChange) {
      onChange({
        target: {
          name,
          value: limpio,
          type: 'text'
        }
      })
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          fontWeight: 600,
          color: '#4b5563'
        }}
      >
        $
      </span>
      <input
        {...props}
        type="text"
        inputMode={inputMode}
        name={name}
        className={className}
        value={valorVisual}
        placeholder={placeholder}
        onChange={manejarCambio}
        style={{
          ...style,
          width: '100%',
          paddingLeft: '28px'
        }}
      />
    </div>
  )
}
