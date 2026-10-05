import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../services/api.js'

function Menu() {
  const [searchParams] = useSearchParams()
  const mesa = searchParams.get('mesa')
  const [menu, setMenu] = useState([])
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!mesa) {
      setError('No se especificó una mesa')
      setLoading(false)
      return
    }
    cargarMenu()
  }, [mesa])

  const cargarMenu = async () => {
    try {
      const response = await api.get(`/api/menu?mesa=${mesa}`)
      setMenu(response.data.menu)
      setToken(response.data.token)
      localStorage.setItem('mesa_token', response.data.token)
      localStorage.setItem('mesa_id', mesa)
    } catch (err) {
      setError('Error al cargar el menú')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center mt-5"><div className="spinner-border"></div></div>
  }

  if (error) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger">{error}</div>
      </div>
    )
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Menú - Mesa {mesa}</h2>
        <span className="badge bg-success">Sesión activa</span>
      </div>

      <div className="row">
        {menu.map(item => (
          <div key={item.id} className="col-md-4 mb-3">
            <div className="card h-100">
              <div className="card-body">
                <h5 className="card-title">{item.nombre}</h5>
                <p className="card-text text-muted">{item.descripcion}</p>
                <p className="card-text">
                  <strong>${item.precio.toLocaleString('es-CO')}</strong>
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-light rounded">
        <small className="text-muted">
          Token de sesión: {token.substring(0, 8)}... | Mesa: {mesa}
        </small>
      </div>
    </div>
  )
}

export default Menu
