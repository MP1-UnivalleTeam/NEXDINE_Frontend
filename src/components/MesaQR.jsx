import { QRCodeSVG } from 'qrcode.react'

function MesaQR({ mesaId, size = 200 }) {
  const url = `${window.location.origin}/menu?mesa=${mesaId}`

  return (
    <div className="text-center">
      <div className="d-inline-block p-3 bg-white rounded shadow">
        <QRCodeSVG value={url} size={size} />
      </div>
      <p className="mt-2 text-muted">Mesa {mesaId}</p>
      <small className="text-muted">{url}</small>
    </div>
  )
}

export default MesaQR
