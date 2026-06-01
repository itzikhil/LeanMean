import { useEffect, useRef, Component, type ReactNode } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

/** Error boundary scoped to the scanner — crashes show fallback, not blank app. */
class ScannerBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (this.state.failed) return <p className="text-center text-inksoft text-sm italic py-4">Barcode scanner unavailable.</p>
    return this.props.children
  }
}

/** Globally track whether a scanner is active so StrictMode double-mount doesn't collide. */
let scannerActive = false

function ScannerInner({ onDetected, onClose }: { onDetected: (code: string) => void; onClose: () => void }) {
  const cbRef = useRef(onDetected)
  cbRef.current = onDetected

  useEffect(() => {
    // Guard: if another instance is still tearing down, skip this mount.
    if (scannerActive) return
    scannerActive = true

    let active = true
    let scanner: Html5Qrcode | null = null
    try {
      scanner = new Html5Qrcode('bc-reader')
    } catch (e) {
      console.error('[BarcodeScanner] init failed:', e)
      scannerActive = false
      return
    }
    const s = scanner
    s.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 160 } },
        (decoded) => { if (active) { active = false; cbRef.current(decoded) } },
        () => {},
      )
      .catch((e) => console.error('[BarcodeScanner] start failed:', e))
    return () => {
      active = false
      s.stop().then(() => s.clear()).catch(() => {}).finally(() => { scannerActive = false })
    }
  }, [])

  return (
    <div className="text-center">
      <div id="bc-reader" className="rounded-xl overflow-hidden mx-auto" style={{ maxWidth: 320 }} />
      <p className="text-[.8rem] text-inksoft mt-3">Point at the barcode. Looks it up on Open Food Facts.</p>
      <button onClick={onClose} className="mt-3 text-sm font-bold text-terra">Cancel</button>
    </div>
  )
}

export default function BarcodeScanner(props: { onDetected: (code: string) => void; onClose: () => void }) {
  return <ScannerBoundary><ScannerInner {...props} /></ScannerBoundary>
}
