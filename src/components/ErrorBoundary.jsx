import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="container mt-5">
          <div className="alert alert-danger">
            <h5 className="alert-heading">No se pudo mostrar esta pantalla</h5>
            <p className="mb-2">Ocurrió un error inesperado. Puede recargar la página para continuar.</p>
            <button className="btn btn-sm btn-dark" onClick={() => window.location.reload()}>
              Recargar
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
