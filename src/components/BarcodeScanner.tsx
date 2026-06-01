import { useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

export default function BarcodeScanner({
  onDetected, onClose,
}: {
  onDetected: (code: string) => void
  onClose: () => void
}) {
  // Stable ref so the useEffect doesn't re-run (and tear down/recreate the
  // scanner) every time AddSheet re-renders with a new onDetected reference.
  const cbRef = useRef(onDetected)
  cbRef.current = onDetected

  useEffect(() => {
    let active = true
    let scanner: Html5Qrcode | null = null
    try {
      scanner = new Html5Qrcode('bc-reader')
    } catch (e) {
      console.error('[BarcodeScanner] init failed:', e)
      return
    }
    const s = scanner
    s.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 160 } },
        (decoded) => {
          if (active) { active = false; cbRef.current(decoded) }
        },
        () => {},
      )
      .catch((e) => console.error('[BarcodeScanner] start failed:', e))
    return () => {
      active = false
      s.stop().then(() => s.clear()).catch(() => {})
    }
  }, []) // stable — runs once on mount, cleans up on unmount

  return (
    <div className="text-center">
      <div id="bc-reader" className="rounded-xl overflow-hidden mx-auto" style={{ maxWidth: 320 }} />
      <p className="text-[.8rem] text-inksoft mt-3">Point at the barcode. Looks it up on Open Food Facts.</p>
      <button onClick={onClose} className="mt-3 text-sm font-bold text-terra">Cancel</button>
    </div>
  )
}
