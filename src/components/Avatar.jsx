/**
 * Foto de perfil del usuario (RF029) o, si no tiene, sus iniciales.
 * Reemplaza al servicio externo ui-avatars, que recibía el nombre del usuario.
 */
function iniciales(nombre) {
  const partes = String(nombre || '?').trim().split(/\s+/).filter(Boolean)
  return ((partes[0]?.[0] || '?') + (partes[1]?.[0] || '')).toUpperCase()
}

function Avatar({ usuario, tamano = 36 }) {
  const url = usuario?.avatarUrl
  if (url && /^https:\/\//.test(url)) {
    return (
      <img
        src={url}
        alt=""
        width={tamano}
        height={tamano}
        style={{ width: tamano, height: tamano, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      style={{
        width: tamano,
        height: tamano,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#10B981',
        color: '#11362E',
        fontWeight: 700,
        fontSize: Math.round(tamano * 0.38)
      }}
    >
      {iniciales(usuario?.nombre)}
    </span>
  )
}

export default Avatar
