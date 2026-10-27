/**
 * Tokens del sistema visual NEXDINE ("Forest Culinary Precision").
 *
 * Fuente: stitch/forest_culinary_precision/DESIGN.md
 * Centraliza colores, sombras, radios y estilos compartidos para que
 * ninguna pantalla introduzca colores propios fuera de esta guía.
 */

export const colores = {
  // Identidad
  primario: '#11362E',      // Verde bosque profundo: navbar, CTAs, marcas
  secundario: '#2D6A4F',    // Verde interactivo: hover, acciones secundarias
  mint: '#E8F5E9',          // Superficie suave: selección activa, contadores

  // Neutrales
  fondo: '#F8FAFC',         // Lienzo general
  superficie: '#F1F5F9',    // Superficies secundarias
  tarjeta: '#FFFFFF',       // Tarjetas y modales
  borde: '#E2E8F0',         // Bordes discretos

  // Texto
  texto: '#1E293B',
  textoSuave: '#64748B',
  textoSuaveClaro: '#94A3B8',

  // Semánticos
  exito: '#10B981',
  exitoFondo: '#DCFCE7',
  exitoTexto: '#166534',
  advertencia: '#F59E0B',
  advertenciaFondo: '#FEF3C7',
  advertenciaTexto: '#92400E',
  error: '#EF4444',
  errorFondo: '#FEE2E2',
  errorTexto: '#991B1B'
}

export const sombras = {
  nivel1: '0px 1px 3px rgba(17, 54, 46, 0.05), 0px 1px 2px rgba(17, 54, 46, 0.03)',
  nivel2: '0px 4px 6px -1px rgba(17, 54, 46, 0.08), 0px 2px 4px -2px rgba(17, 54, 46, 0.04)',
  nivel3: '0px 20px 25px -5px rgba(17, 54, 46, 0.12), 0px 8px 10px -6px rgba(17, 54, 46, 0.08)',
  backdrop: 'rgba(17, 54, 46, 0.35)'
}

export const radios = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999
}

/** Tarjeta base (nivel 1 de elevación). */
export const tarjeta = {
  background: colores.tarjeta,
  border: `1px solid ${colores.borde}`,
  borderRadius: radios.lg,
  boxShadow: sombras.nivel1
}

/** Botón primario (CTA verde bosque). */
export const btnPrimario = {
  backgroundColor: colores.primario,
  color: '#FFFFFF',
  border: `1px solid ${colores.primario}`,
  borderRadius: radios.sm,
  fontWeight: 600,
  minHeight: '48px',
  transition: 'background-color 0.15s ease, box-shadow 0.15s ease'
}

/** Botón secundario / fantasma. */
export const btnGhost = {
  backgroundColor: colores.tarjeta,
  color: colores.primario,
  border: `1px solid ${colores.borde}`,
  borderRadius: radios.sm,
  fontWeight: 600,
  minHeight: '44px',
  transition: 'background-color 0.15s ease, border-color 0.15s ease'
}

/** Botón mint (agregar sugerencias / acciones suaves). */
export const btnMint = {
  backgroundColor: colores.mint,
  color: colores.primario,
  border: `1px solid ${colores.borde}`,
  borderRadius: radios.sm,
  fontWeight: 600,
  minHeight: '44px'
}

/** Campo de entrada (48px, foco visual consistente). */
export const input = {
  height: '48px',
  border: `1px solid ${colores.borde}`,
  borderRadius: radios.sm,
  backgroundColor: colores.tarjeta,
  color: colores.texto,
  fontSize: '14px'
}

/** Backdrop de modales (verde con desenfoque, nivel 3). */
export const backdrop = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backgroundColor: sombras.backdrop,
  backdropFilter: 'blur(4px)',
  zIndex: 1040
}

/** Etiqueta de estado tipo píldora. */
export function estiloBadge(fondo, texto) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    height: '24px',
    padding: '0 10px',
    borderRadius: radios.full,
    backgroundColor: fondo,
    color: texto,
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.01em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap'
  }
}

/** Cifras tabulares para precios (alineación vertical de listas). */
export const cifrasTabulares = {
  fontFeatureSettings: '"tnum" 1, "cv05" 1'
}

/** Truncado a N líneas (descripciones de tarjetas de comida). */
export const lineasMax = (n) => ({
  display: '-webkit-box',
  WebkitLineClamp: n,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden'
})
