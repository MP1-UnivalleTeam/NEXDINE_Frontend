/**
 * RF026 (modo oscuro) y RF029 (color de acento del perfil).
 *
 * La preferencia se guarda en este navegador para aplicarla antes de pintar
 * la primera pantalla, y en el perfil del servidor cuando hay sesión.
 */

const CLAVE_TEMA = 'nexdine.tema'
const CLAVE_ACENTO = 'nexdine.acento'

export const TEMAS = [
  { valor: 'CLARO', etiqueta: 'Claro' },
  { valor: 'OSCURO', etiqueta: 'Oscuro' },
  { valor: 'SISTEMA', etiqueta: 'Según el sistema' }
]

/** Colores de acento disponibles: el tono claro y su versión para modo oscuro. */
export const ACENTOS = [
  { nombre: 'Bosque', claro: '#11362E', oscuro: '#2E8B66' },
  { nombre: 'Azul', claro: '#1D4ED8', oscuro: '#3B82F6' },
  { nombre: 'Vino', claro: '#9F1239', oscuro: '#E11D48' },
  { nombre: 'Ámbar', claro: '#B45309', oscuro: '#D97706' },
  { nombre: 'Morado', claro: '#6D28D9', oscuro: '#8B5CF6' },
  { nombre: 'Pizarra', claro: '#334155', oscuro: '#64748B' }
]

function leer(clave) {
  try {
    return localStorage.getItem(clave)
  } catch {
    return null
  }
}

function escribir(clave, valor) {
  try {
    if (valor) localStorage.setItem(clave, valor)
    else localStorage.removeItem(clave)
  } catch {
    // Sin almacenamiento: la preferencia dura hasta recargar.
  }
}

const consultaOscuro = typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : null

export function temaGuardado() {
  const tema = leer(CLAVE_TEMA)
  return TEMAS.some(t => t.valor === tema) ? tema : 'SISTEMA'
}

export function acentoGuardado() {
  return leer(CLAVE_ACENTO) || ''
}

/** Resuelve SISTEMA al tema real según el sistema operativo. */
export function temaEfectivo(tema = temaGuardado()) {
  if (tema === 'OSCURO') return 'OSCURO'
  if (tema === 'CLARO') return 'CLARO'
  return consultaOscuro?.matches ? 'OSCURO' : 'CLARO'
}

function pintar() {
  const raiz = document.documentElement
  const oscuro = temaEfectivo() === 'OSCURO'
  raiz.dataset.theme = oscuro ? 'dark' : 'light'
  raiz.setAttribute('data-bs-theme', oscuro ? 'dark' : 'light')

  const acento = ACENTOS.find(a => a.claro.toLowerCase() === acentoGuardado().toLowerCase())
  if (acento) {
    raiz.style.setProperty('--nx-acento', acento.claro)
    raiz.style.setProperty('--nx-acento-oscuro', acento.oscuro)
  } else {
    raiz.style.removeProperty('--nx-acento')
    raiz.style.removeProperty('--nx-acento-oscuro')
  }
  window.dispatchEvent(new Event('nexdine-tema'))
}

export function aplicarTema(tema) {
  escribir(CLAVE_TEMA, tema)
  pintar()
}

export function aplicarAcento(color) {
  escribir(CLAVE_ACENTO, color)
  pintar()
}

/** Toma la preferencia del perfil del servidor (si la hay) y la aplica. */
export function sincronizarConPerfil(usuario) {
  if (!usuario) return
  if (usuario.tema) escribir(CLAVE_TEMA, usuario.tema)
  escribir(CLAVE_ACENTO, usuario.colorAcento || '')
  pintar()
}

/** Se llama una vez al arrancar, antes del primer render. */
export function iniciarTema() {
  pintar()
  consultaOscuro?.addEventListener?.('change', () => {
    if (temaGuardado() === 'SISTEMA') pintar()
  })
}
