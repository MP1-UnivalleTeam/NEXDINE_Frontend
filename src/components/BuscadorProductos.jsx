import { listarCategorias } from '../utils/buscadorProductos.js'
import { colores, radios, input } from '../styles/tokens.js'
import { FiSearch } from 'react-icons/fi'

/**
 * RF019 — Buscar productos.
 *
 * Componente presentacional reutilizable. No conoce el catálogo: recibe
 * las categorías ya filtradas por disponibilidad y solo emite cambios.
 * Así puede reutilizarse en el menú y en el futuro módulo de pedidos.
 *
 * Visual: campo de búsqueda + píldoras de categoría (DESIGN.md).
 */
function BuscadorProductos({
  categoriasDisponibles,
  texto,
  categoriaId,
  onChange,
  placeholder = 'Buscar productos...'
}) {
  const opciones = listarCategorias(categoriasDisponibles)

  const selecionarCategoria = (nombre) => {
    onChange({
      texto,
      categoriaId: categoriaId === nombre ? null : nombre
    })
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ position: 'relative', maxWidth: '560px' }}>
        <FiSearch style={{
          position: 'absolute', left: '14px', top: '14px',
          color: colores.textoSuaveClaro
        }} />
        <input
          type="text"
          placeholder={placeholder}
          value={texto}
          onChange={(e) => onChange({ texto: e.target.value, categoriaId })}
          aria-label="Buscar productos"
          style={{ ...input, width: '100%', paddingLeft: '38px' }}
        />
      </div>

      {opciones.length > 0 && (
        <div style={{
          display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px'
        }}>
          {opciones.map((c) => {
            const activo = categoriaId === c
            return (
              <button
                key={c}
                type="button"
                onClick={() => selecionarCategoria(c)}
                style={{
                  minHeight: '40px',
                  padding: '0 14px',
                  borderRadius: radios.full,
                  border: activo ? `1px solid ${colores.primario}` : `1px solid ${colores.borde}`,
                  backgroundColor: activo ? colores.primario : colores.tarjeta,
                  color: activo ? 'white' : colores.texto,
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease'
                }}
              >
                {c}
              </button>
            )
          })}
        </div>
      )}

      {(texto || categoriaId) && (
        <button
          type="button"
          className="btn btn-link btn-sm p-0 mt-2"
          style={{ color: colores.secundario, fontWeight: 600 }}
          onClick={() => onChange({ texto: '', categoriaId: null })}
        >
          Limpiar búsqueda
        </button>
      )}
    </div>
  )
}

export default BuscadorProductos
