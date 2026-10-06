const serviceTypes = [
  { value: 'para_llevar', label: 'Para llevar', icon: 'fa-bag-shopping' },
  { value: 'comer_aqui', label: 'Para comer acá', icon: 'fa-utensils' },
  { value: 'domicilio', label: 'Para domicilio', icon: 'fa-motorcycle' }
]

function ServiceTypeSelector({ value, onChange }) {
  const selectedService = serviceTypes.find(service => service.value === value)

  return (
    <fieldset className="mb-4">
      <legend className="h5 mb-3">¿Qué tipo de servicio deseas?</legend>
      <div className="row g-3">
        {serviceTypes.map(service => (
          <div className="col-md-4" key={service.value}>
            <label
              className="card h-100 p-3 text-center"
              style={{
                cursor: 'pointer',
                border: value === service.value ? '2px solid #1a3c34' : '1px solid #dee2e6',
                backgroundColor: value === service.value ? '#f0f6f3' : 'white'
              }}
            >
              <input
                type="radio"
                name="tipoServicio"
                className="visually-hidden"
                value={service.value}
                checked={value === service.value}
                onChange={() => onChange(service.value)}
              />
              <i className={`fa-solid ${service.icon} fa-lg mb-2`} aria-hidden="true"></i>
              <span className="fw-semibold">{service.label}</span>
            </label>
          </div>
        ))}
      </div>
      {selectedService && (
        <p className="mt-3 mb-0 text-success" role="status">
          <i className="fa-solid fa-circle-check me-2"></i>
          Servicio seleccionado: {selectedService.label}
        </p>
      )}
    </fieldset>
  )
}

export default ServiceTypeSelector
