import { listarCategorias } from '../utils/buscadorProductos.js'

/**
 * RF019 — Buscar productos.
 *
 * Componente presentacional reutilizable. No conoce el catálogo: recibe
 * las categorías ya filtradas por disponibilidad y solo emite cambios.
 * Así puede reutilizarse en el menú y en el futuro módulo de pedidos.
 */
function BuscadorProductos({
  categoriasDisponibles,
  texto,
  categoriaId,
  onChange,
  placeholder = 'Buscar productos...'
}) {
  const opciones = listarCategorias(categoriasDisponibles)

  return (
    <div className="mb-4">
      <div className="row g-2">
        <div className="col-md-7">
          <div className="input-group">
            <span className="input-group-text bg-white">
              <i className="fa-solid fa-magnifying-glass text-muted"></i>
            </span>
            <input
              type="text"
              className="form-control"
              placeholder={placeholder}
              value={texto}
              onChange={(e) => onChange({ texto: e.target.value, categoriaId })}
              aria-label="Buscar productos"
            />
          </div>
        </div>

        <div className="col-md-5">
          <select
            className="form-select"
            value={categoriaId || ''}
            onChange={(e) => onChange({ texto, categoriaId: e.target.value || null })}
            aria-label="Filtrar por categoría"
          >
            <option value="">Todas las categorías</option>
            {opciones.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {(texto || categoriaId) && (
        <button
          type="button"
          className="btn btn-link btn-sm p-0 mt-2"
          style={{ color: '#1a3c34' }}
          onClick={() => onChange({ texto: '', categoriaId: null })}
        >
          Limpiar búsqueda
        </button>
      )}
    </div>
  )
}

export default BuscadorProductos