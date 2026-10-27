/**
 * Cargador de imagen de producto (experiencia tipo Google Drive).
 *
 * Diseño: Stitch "crear_producto_modal_arrastra_y_suelta_abierto".
 *
 * · Zona de arrastrar y soltar + botón para explorar archivos del equipo.
 * · Validación de formato (JPEG / PNG / WebP) y tamaño en el cliente,
 *   alineada con ImagenProductoValidador del backend.
 * · Previsualización, quitar y reemplazar sin cargar nada dos veces:
 *   el archivo se conserva en el formulario y SOLO se envía al guardar
 *   el producto, momento en el cual el backend lo sube a Cloudinary
 *   (ninguna subida temporal ni URLs ficticias).
 * · La URL manual sigue disponible como opción avanzada (el backend la
 *   admite en imagenUrl para productos con recursos externos).
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { FiX, FiUploadCloud, FiLink, FiCheck } from 'react-icons/fi'
import { colores, sombras, radios, backdrop } from '../styles/tokens.js'

const FORMATOS_MIME = ['image/jpeg', 'image/png', 'image/webp']
const EXTESIONES = /\.(jpe?g|png|webp)$/i
const MAX_BYTES_DEFECTO = 5 * 1024 * 1024

function formatearBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`
  return `${Math.round(bytes / 1024)} KB`
}

function CargadorImagen({
  visible,
  onCerrar,
  archivoSeleccionado,
  previewUrl,
  urlManual,
  onArchivo,
  onUrl,
  maxBytes = MAX_BYTES_DEFECTO
}) {
  const [error, setError] = useState('')
  const [arrastrando, setArrastrando] = useState(false)
  const [modoUrl, setModoUrl] = useState(false)
  const [urlTexto, setUrlTexto] = useState('')
  const inputArchivo = useRef(null)

  useEffect(() => {
    if (visible) {
      setError('')
      setArrastrando(false)
      setModoUrl(false)
      setUrlTexto(urlManual || '')
    }
  }, [visible, urlManual])

  // Revocar el preview anterior al desmontar lo maneja la página (URL.createObjectURL)
  const validarArchivo = useCallback((archivo) => {
    if (!archivo) return
    const tipoOk = FORMATOS_MIME.includes(archivo.type) || EXTESIONES.test(archivo.name)
    if (!tipoOk) {
      setError('Formato no admitido. Usa una imagen JPG, PNG o WebP.')
      return
    }
    if (archivo.size > maxBytes) {
      setError(`La imagen supera el tamaño máximo de ${formatearBytes(maxBytes)}.`)
      return
    }
    setError('')
    onArchivo(archivo)
    onCerrar()
  }, [maxBytes, onArchivo, onCerrar])

  if (!visible) return null

  return (
    <>
      <div onClick={onCerrar} style={backdrop} />
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1050,
        width: 'min(92vw, 480px)',
        maxHeight: '92vh',
        overflowY: 'auto'
      }}>
        <div style={{
          background: colores.tarjeta,
          border: `1px solid ${colores.borde}`,
          borderRadius: radios.xl,
          boxShadow: sombras.nivel3,
          overflow: 'hidden'
        }}>
          {/* Encabezado */}
          <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div style={{
              width: '44px', height: '44px',
              borderRadius: radios.md,
              backgroundColor: colores.primario, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <FiUploadCloud size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <h6 style={{ margin: 0, fontWeight: 700, color: colores.texto }}>
                Cargar fotografía del plato
              </h6>
              <small style={{ color: colores.textoSuave }}>
                Arrastra una imagen o selecciónala desde tu equipo.
                Se sube y optimiza al guardar el producto.
              </small>
            </div>
            <button
              type="button"
              onClick={onCerrar}
              style={{
                border: 'none', background: 'transparent', color: colores.textoSuave,
                cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '4px'
              }}
              aria-label="Cerrar"
            >
              <FiX />
            </button>
          </div>

          <div style={{ padding: '0 24px 24px 24px' }}>
            {/* Zona de arrastrar y soltar */}
            {!archivoSeleccionado && (
              <div
                onDragOver={(e) => { e.preventDefault(); setArrastrando(true) }}
                onDragLeave={() => setArrastrando(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setArrastrando(false)
                  const archivo = e.dataTransfer.files?.[0]
                  validarArchivo(archivo)
                }}
                onClick={() => inputArchivo.current?.click()}
                style={{
                  border: `2px dashed ${arrastrando ? colores.secundario : colores.borde}`,
                  borderRadius: radios.lg,
                  backgroundColor: arrastrando ? colores.mint : colores.superficie,
                  padding: '28px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease, border-color 0.15s ease'
                }}
              >
                <div style={{
                  width: '48px', height: '48px', margin: '0 auto 10px auto',
                  borderRadius: '50%', backgroundColor: colores.mint,
                  color: colores.primario, display: 'flex',
                  alignItems: 'center', justifyContent: 'center'
                }}>
                  <FiUploadCloud size={22} />
                </div>
                <div style={{ fontWeight: 600, color: colores.texto }}>
                  Arrastra y suelta tu imagen aquí
                </div>
                <small style={{ color: colores.textoSuave, display: 'block', marginTop: '4px' }}>
                  Coloca el archivo directamente en esta área
                </small>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  margin: '14px 0'
                }}>
                  <div style={{ flex: 1, height: '1px', backgroundColor: colores.borde }} />
                  <small style={{ color: colores.textoSuaveClaro, fontSize: '11px' }}>O BIEN</small>
                  <div style={{ flex: 1, height: '1px', backgroundColor: colores.borde }} />
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); inputArchivo.current?.click() }}
                  className="btn"
                  style={{
                    backgroundColor: colores.primario, color: '#fff',
                    border: 'none', fontWeight: 600, minHeight: '44px',
                    borderRadius: radios.sm, padding: '0 18px'
                  }}
                >
                  Explorar archivos de tu equipo
                </button>
              </div>
            )}

            {/* Previsualización del archivo seleccionado */}
            {archivoSeleccionado && (
              <div style={{
                border: `1px solid ${colores.borde}`,
                borderRadius: radios.lg,
                backgroundColor: colores.superficie,
                padding: '14px',
                display: 'flex', gap: '14px', alignItems: 'center'
              }}>
                <img
                  src={previewUrl}
                  alt="Previsualización"
                  style={{
                    width: '72px', height: '72px', objectFit: 'cover',
                    borderRadius: radios.md, border: `1px solid ${colores.borde}`
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 600, fontSize: '14px', color: colores.texto,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                  }}>
                    {archivoSeleccionado.name}
                  </div>
                  <small style={{ color: colores.textoSuave }}>
                    {formatearBytes(archivoSeleccionado.size)}
                  </small>
                  <div>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      color: colores.exitoTexto, fontSize: '12px', fontWeight: 600
                    }}>
                      <FiCheck /> Lista para guardar
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => inputArchivo.current?.click()}
                    style={{ color: colores.secundario, padding: '4px 0', fontWeight: 600 }}
                  >
                    Reemplazar
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => { onArchivo(null); setError('') }}
                  aria-label="Quitar imagen seleccionada"
                  style={{
                    border: 'none', background: 'transparent',
                    color: colores.error, cursor: 'pointer', padding: '8px'
                  }}
                >
                  <FiX />
                </button>
              </div>
            )}

            {/* URL manual (opción avanzada que ya soporta el backend) */}
            {!archivoSeleccionado && !modoUrl && (
              <button
                type="button"
                onClick={() => setModoUrl(true)}
                className="btn w-100 mt-3"
                style={{
                  background: colores.tarjeta, border: `1px solid ${colores.borde}`,
                  color: colores.texto, fontWeight: 600, minHeight: '44px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  borderRadius: radios.sm
                }}
              >
                <span><FiLink style={{ marginRight: 8 }} /> Pegar URL de imagen</span>
                <span style={{ color: colores.textoSuaveClaro }}>›</span>
              </button>
            )}

            {modoUrl && !archivoSeleccionado && (
              <div className="mt-3">
                <label className="form-label small fw-semibold" style={{ color: colores.texto }}>
                  URL de la imagen
                </label>
                <div className="d-flex gap-2">
                  <input
                    type="text"
                    className="form-control"
                    style={{ height: '44px', borderColor: colores.borde }}
                    placeholder="https://ejemplo.com/imagen.jpg"
                    value={urlTexto}
                    onChange={(e) => { setUrlTexto(e.target.value); setError('') }}
                  />
                  <button
                    type="button"
                    className="btn"
                    style={{
                      backgroundColor: colores.mint, color: colores.primario,
                      border: `1px solid ${colores.borde}`, fontWeight: 600, borderRadius: radios.sm
                    }}
                    onClick={() => { onUrl(urlTexto.trim()); onCerrar() }}
                  >
                    Usar URL
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-3" style={{
                backgroundColor: colores.errorFondo, color: colores.errorTexto,
                borderRadius: radios.sm, padding: '10px 12px', fontSize: '13px'
              }}>
                {error}
              </div>
            )}

            <div className="mt-3" style={{
              backgroundColor: colores.mint, borderRadius: radios.sm,
              padding: '10px 12px', fontSize: '12.5px', color: colores.primario
            }}>
              Formatos admitidos: JPG, PNG, WebP (máx. {formatearBytes(maxBytes)}).
              La subida a Cloudinary ocurre al guardar el producto.
            </div>
          </div>

          {/* Pie */}
          <div style={{
            borderTop: `1px solid ${colores.borde}`,
            backgroundColor: colores.superficie,
            padding: '14px 24px',
            display: 'flex', justifyContent: 'flex-end', gap: '10px'
          }}>
            <button
              type="button"
              className="btn"
              onClick={onCerrar}
              style={{
                backgroundColor: colores.tarjeta, border: `1px solid ${colores.borde}`,
                color: colores.texto, fontWeight: 600, borderRadius: radios.sm
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>

      <input
        ref={inputArchivo}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => {
          validarArchivo(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </>
  )
}

export default CargadorImagen
