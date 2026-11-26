import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiCamera, FiTrash2, FiCheck, FiSun, FiMoon, FiMonitor } from 'react-icons/fi'
import api from '../services/api.js'
import Sidebar from '../components/Sidebar.jsx'
import { UbicacionActual } from '../components/EncabezadoPagina.jsx'
import Avatar from '../components/Avatar.jsx'
import { obtenerPerfil, actualizarPerfil, subirFotoPerfil, quitarFotoPerfil } from '../services/perfil.js'
import { ACENTOS, TEMAS, aplicarTema, aplicarAcento } from '../utils/tema.js'
import { colores, radios, tarjeta, btnPrimario, btnGhost, input } from '../styles/tokens.js'

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const etiqueta = { display: 'block', fontSize: '12.5px', fontWeight: 600, color: colores.texto, marginBottom: '5px' }
const ICONOS_TEMA = { CLARO: FiSun, OSCURO: FiMoon, SISTEMA: FiMonitor }
const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp']

/** RF029: personalizar el perfil con foto, colores y tema. */
function Perfil() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [datos, setDatos] = useState({ correo: '', celular: '', direccion: '' })
  const [guardando, setGuardando] = useState('')
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' })
  const archivo = useRef(null)

  useEffect(() => {
    api.get('/api/auth/me')
      .then(async ({ data }) => {
        setCurrentUser(data)
        const p = await obtenerPerfil()
        setPerfil(p)
        setDatos({ correo: p.correo || '', celular: p.celular || '', direccion: p.direccion || '' })
      })
      .catch(() => navigate('/login'))
  }, [navigate])

  const avisar = (tipo, texto) => {
    setMensaje({ tipo, texto })
    if (tipo !== 'error') setTimeout(() => setMensaje({ tipo: '', texto: '' }), 4000)
  }

  // Aplica la respuesta del servidor y la refleja en la barra lateral.
  const aplicar = (actualizado) => {
    setPerfil(actualizado)
    setCurrentUser(prev => ({ ...prev, ...actualizado }))
  }

  const guardarDatos = async (e) => {
    e.preventDefault()
    if (datos.correo.trim() && !CORREO_VALIDO.test(datos.correo.trim())) return avisar('error', 'El correo no es válido.')
    if (datos.celular.trim() && !/^[0-9+ ]{7,20}$/.test(datos.celular.trim())) return avisar('error', 'El celular solo admite números (7 a 20).')
    setGuardando('datos')
    try {
      aplicar(await actualizarPerfil({
        correo: datos.correo.trim(), celular: datos.celular.trim(), direccion: datos.direccion.trim()
      }))
      avisar('exito', 'Datos actualizados.')
    } catch (err) {
      avisar('error', err.response?.data?.error || 'No fue posible guardar tus datos.')
    } finally {
      setGuardando('')
    }
  }

  const elegirTema = async (tema) => {
    aplicarTema(tema)
    setPerfil(prev => ({ ...prev, tema }))
    try {
      aplicar(await actualizarPerfil({ tema }))
    } catch {
      avisar('aviso', 'El tema se aplicó en este navegador, pero no se pudo guardar en tu perfil.')
    }
  }

  const elegirAcento = async (color) => {
    aplicarAcento(color)
    setPerfil(prev => ({ ...prev, colorAcento: color }))
    try {
      aplicar(await actualizarPerfil({ colorAcento: color }))
    } catch {
      avisar('aviso', 'El color se aplicó en este navegador, pero no se pudo guardar en tu perfil.')
    }
  }

  const cambiarFoto = async (e) => {
    const elegido = e.target.files?.[0]
    e.target.value = ''
    if (!elegido) return
    if (!TIPOS_IMAGEN.includes(elegido.type)) return avisar('error', 'La foto debe ser JPEG, PNG o WebP.')
    if (elegido.size > 5 * 1024 * 1024) return avisar('error', 'La foto no puede superar 5 MB.')
    setGuardando('foto')
    try {
      aplicar(await subirFotoPerfil(elegido))
      avisar('exito', 'Foto actualizada.')
    } catch (err) {
      avisar('error', err.response?.status === 503
        ? 'La subida de imágenes no está configurada en el servidor.'
        : err.response?.data?.error || 'No fue posible subir la foto.')
    } finally {
      setGuardando('')
    }
  }

  const quitarFoto = async () => {
    setGuardando('foto')
    try {
      aplicar(await quitarFotoPerfil())
      avisar('exito', 'Foto eliminada.')
    } catch (err) {
      avisar('error', err.response?.data?.error || 'No fue posible quitar la foto.')
    } finally {
      setGuardando('')
    }
  }

  const handleLogout = async () => {
    try { await api.get('/logout') } catch { /* sesión ya cerrada */ }
    navigate('/login')
  }

  if (!currentUser || !perfil) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: colores.fondo }}>
        <div className="spinner-border" style={{ color: colores.primario }}></div>
      </div>
    )
  }

  const acentoActual = (perfil.colorAcento || ACENTOS[0].claro).toLowerCase()
  const temaActual = perfil.tema || 'SISTEMA'
  const colorMensaje = mensaje.tipo === 'error'
    ? [colores.errorFondo, colores.errorTexto]
    : mensaje.tipo === 'aviso' ? [colores.advertenciaFondo, colores.advertenciaTexto] : [colores.exitoFondo, colores.exitoTexto]
  const seccion = { ...tarjeta, padding: '20px', marginBottom: '16px' }

  return (
    <div className="nexdine-shell" style={{ display: 'flex', minHeight: '100vh', overflowX: 'hidden', backgroundColor: colores.fondo }}>
      <Sidebar currentUser={currentUser} rutaActual="/perfil" onLogout={handleLogout} />
      <div className="nexdine-main" style={{ marginLeft: '260px', flex: 1, padding: '30px', minWidth: 0, maxWidth: '860px' }}>
        <UbicacionActual />
        <h2 style={{ margin: '0 0 20px', fontWeight: 700, color: colores.texto }}>Mi perfil</h2>

        {mensaje.texto && (
          <div role={mensaje.tipo === 'error' ? 'alert' : 'status'} style={{ ...tarjeta, backgroundColor: colorMensaje[0], color: colorMensaje[1], border: 'none', padding: '12px 16px', marginBottom: '16px', fontSize: '13.5px' }}>
            {mensaje.texto}
          </div>
        )}

        <section style={{ ...seccion, display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }} aria-labelledby="titulo-foto">
          <Avatar usuario={perfil} tamano={84} />
          <div style={{ flex: '1 1 220px' }}>
            <h5 id="titulo-foto" style={{ margin: 0, fontWeight: 700, color: colores.texto }}>{perfil.nombre}</h5>
            <small style={{ color: colores.textoSuave }}>Foto de perfil · JPEG, PNG o WebP de hasta 5 MB</small>
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
              <input ref={archivo} type="file" accept={TIPOS_IMAGEN.join(',')} onChange={cambiarFoto} hidden />
              <button type="button" className="btn" disabled={Boolean(guardando)} onClick={() => archivo.current?.click()} style={{ ...btnGhost, minHeight: '40px', fontSize: '13px' }}>
                <FiCamera style={{ marginRight: '6px' }} />{guardando === 'foto' ? 'Subiendo…' : 'Cambiar foto'}
              </button>
              {perfil.avatarUrl && (
                <button type="button" className="btn" disabled={Boolean(guardando)} onClick={quitarFoto} style={{ ...btnGhost, minHeight: '40px', fontSize: '13px', color: colores.errorTexto }}>
                  <FiTrash2 style={{ marginRight: '6px' }} />Quitar
                </button>
              )}
            </div>
          </div>
        </section>

        <section style={seccion} aria-labelledby="titulo-tema">
          <h5 id="titulo-tema" style={{ fontWeight: 700, color: colores.texto }}>Tema</h5>
          <div role="radiogroup" aria-labelledby="titulo-tema" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {TEMAS.map(t => {
              const Icono = ICONOS_TEMA[t.valor]
              const activo = temaActual === t.valor
              return (
                <button key={t.valor} type="button" role="radio" aria-checked={activo} onClick={() => elegirTema(t.valor)} style={{
                  flex: '1 1 140px', minHeight: '48px', borderRadius: radios.sm, fontWeight: 600, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  border: `2px solid ${activo ? colores.primario : colores.borde}`,
                  backgroundColor: activo ? colores.mint : colores.tarjeta, color: colores.texto
                }}>
                  <Icono aria-hidden="true" /> {t.etiqueta}
                </button>
              )
            })}
          </div>

          <h6 style={{ fontWeight: 700, color: colores.texto, margin: '20px 0 10px' }} id="titulo-acento">Color de la interfaz</h6>
          <div role="radiogroup" aria-labelledby="titulo-acento" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {ACENTOS.map(a => {
              const activo = acentoActual === a.claro.toLowerCase()
              return (
                <button key={a.claro} type="button" role="radio" aria-checked={activo} aria-label={a.nombre} title={a.nombre}
                  onClick={() => elegirAcento(a.claro)} style={{
                    width: '76px', padding: '8px 4px', borderRadius: radios.md, cursor: 'pointer', background: colores.tarjeta,
                    border: `2px solid ${activo ? a.claro : colores.borde}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px'
                  }}>
                  <span style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: a.claro, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    {activo && <FiCheck aria-hidden="true" />}
                  </span>
                  <small style={{ color: colores.texto, fontWeight: 600 }}>{a.nombre}</small>
                </button>
              )
            })}
          </div>
        </section>

        <section style={seccion} aria-labelledby="titulo-datos">
          <h5 id="titulo-datos" style={{ fontWeight: 700, color: colores.texto }}>Datos de contacto</h5>
          <form onSubmit={guardarDatos} className="row g-3">
            <div className="col-12 col-md-6">
              <label style={etiqueta} htmlFor="perfil-correo">Correo</label>
              <input id="perfil-correo" type="email" value={datos.correo} onChange={(e) => setDatos(p => ({ ...p, correo: e.target.value }))} style={{ ...input, width: '100%', padding: '0 12px' }} />
              {currentUser.rol === 'CLIENTE' && <small style={{ color: colores.textoSuave }}>Te avisaremos aquí cuando cambie el estado de tus pedidos.</small>}
            </div>
            <div className="col-12 col-md-6">
              <label style={etiqueta} htmlFor="perfil-celular">Celular</label>
              <input id="perfil-celular" inputMode="tel" value={datos.celular} onChange={(e) => setDatos(p => ({ ...p, celular: e.target.value }))} style={{ ...input, width: '100%', padding: '0 12px' }} />
            </div>
            <div className="col-12">
              <label style={etiqueta} htmlFor="perfil-direccion">Dirección</label>
              <input id="perfil-direccion" value={datos.direccion} maxLength={200} onChange={(e) => setDatos(p => ({ ...p, direccion: e.target.value }))} style={{ ...input, width: '100%', padding: '0 12px' }} />
            </div>
            <div className="col-12" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn" disabled={Boolean(guardando)} style={{ ...btnPrimario, minHeight: '44px' }}>
                {guardando === 'datos' ? 'Guardando…' : 'Guardar datos'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}

export default Perfil
