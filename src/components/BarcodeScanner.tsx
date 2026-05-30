import { useEffect } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

export default function BarcodeScanner({
  onDetected, onClose,
}: {
  onDetected: (code: string) => void
  onClose: () => void
}) {
  useEffect(() => {
    const scanner = new Html5Qrcode('bc-reader')
    let active = true
    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 160 } },
        (decoded) => {
          if (active) { active = false; onDetected(decoded) }
        },
        () => {},
      )
      .catch((e) => console.error('scanner', e))
    return () => {
      scanner.stop().then(() => scanner.clear()).catch(() => {})
    }
  }, [onDetected])

  return (
    <div className="text-center">
      <div id="bc-reader" className="rounded-xl overflow-hidden mx-auto" style={{ maxWidth: 320 }} />
      <p className="text-[.8rem] text-inksoft mt-3">Point at the barcode. Looks it up on Open Food Facts.</p>
      <button onClick={onClose} className="mt-3 text-sm font-bold text-terra">Cancel</button>
    </div>
  )
}
