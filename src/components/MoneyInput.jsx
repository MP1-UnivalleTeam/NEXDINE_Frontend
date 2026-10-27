const formatearInputMoneda = (valor) => {
  const sinFormato = String(valor ?? '').replace(/[^\d]/g, '')
  if (!sinFormato) return ''
  return sinFormato.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export default function MoneyInput({ value, onChange, name, placeholder = '', style, className, inputMode = 'numeric', ...props }) {
  const valorVisual = formatearInputMoneda(value)

  const manejarCambio = (evento) => {
    const limpio = String(evento.target.value ?? '').replace(/[^\d]/g, '')
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
          paddingLeft: '42px'
        }}
      />
    </div>
  )
}
