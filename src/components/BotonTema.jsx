import { useEffect, useState } from 'react'
import { FiMoon, FiSun } from 'react-icons/fi'
import { aplicarTema, temaEfectivo } from '../utils/tema.js'
import { actualizarPerfil } from '../services/perfil.js'

/**
 * RF026: activa o desactiva el modo oscuro. Si hay sesión, la preferencia se
 * guarda también en el perfil para que siga al usuario en otros equipos.
 *
 * variante 'oscura' es para fondos verdes (barra lateral); 'clara' para
 * encabezados sobre la tarjeta.
 */
function BotonTema({ conSesion = false, variante = 'clara', conEtiqueta = false }) {
  const [oscuro, setOscuro] = useState(() => temaEfectivo() === 'OSCURO')

  useEffect(() => {
    const actualizar = () => setOscuro(temaEfectivo() === 'OSCURO')
    window.addEventListener('nexdine-tema', actualizar)
    return () => window.removeEventListener('nexdine-tema', actualizar)
  }, [])

  const alternar = () => {
    const nuevo = oscuro ? 'CLARO' : 'OSCURO'
    aplicarTema(nuevo)
    if (conSesion) {
      actualizarPerfil({ tema: nuevo }).catch(() => {
        // Sin conexión: la preferencia queda en este navegador.
      })
    }
  }

  const etiqueta = oscuro ? 'Activar modo claro' : 'Activar modo oscuro'
  const sobreVerde = variante === 'oscura'

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={etiqueta}
      aria-pressed={oscuro}
      title={etiqueta}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        minHeight: 36,
        minWidth: 36,
        justifyContent: 'center',
        padding: conEtiqueta ? '0 12px' : 0,
        borderRadius: 8,
        border: sobreVerde ? '1px solid rgba(255,255,255,0.18)' : '1px solid var(--nx-borde)',
        background: sobreVerde ? 'rgba(255,255,255,0.08)' : 'var(--nx-tarjeta)',
        color: sobreVerde ? 'rgba(255,255,255,0.88)' : 'var(--nx-texto)',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer'
      }}
    >
      {oscuro ? <FiSun size={16} aria-hidden="true" /> : <FiMoon size={16} aria-hidden="true" />}
      {conEtiqueta && <span>{oscuro ? 'Modo claro' : 'Modo oscuro'}</span>}
    </button>
  )
}

export default BotonTema
