import { useEffect } from 'react'

function Toast({ message, type = 'success', onClose, duration = 3500 }) {
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => onClose?.(), duration)
    return () => clearTimeout(timer)
  }, [message, duration, onClose])

  if (!message) return null

  const isSuccess = type === 'success'

  return (
    <div
      className="position-fixed top-0 end-0 m-4"
      style={{ zIndex: 2000, minWidth: '320px', maxWidth: '430px' }}
      role="alert"
      aria-live="polite"
    >
      <div className={`alert ${isSuccess ? 'alert-success' : 'alert-danger'} shadow-sm d-flex align-items-center mb-0`}>
        <i className={`fa-solid ${isSuccess ? 'fa-circle-check' : 'fa-circle-exclamation'} me-2`}></i>
        <div className="flex-grow-1">{message}</div>
        <button type="button" className="btn-close ms-2" aria-label="Cerrar" onClick={onClose} />
      </div>
    </div>
  )
}

export default Toast
