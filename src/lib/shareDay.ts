import { toPng } from 'html-to-image'

export async function shareDay(element: HTMLElement, dateStr: string): Promise<void> {
  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: 2, // Higher resolution for sharp images
  })

  // Convert data URL to blob
  const response = await fetch(dataUrl)
  const blob = await response.blob()

  const filename = `lean-kitchen-${dateStr}.png`

  // Try native share if available (mobile)
  if (navigator.share && navigator.canShare) {
    const file = new File([blob], filename, { type: 'image/png' })
    const shareData = { files: [file] }

    if (navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData)
        return
      } catch (err) {
        // User cancelled or share failed, fall through to download
        if ((err as Error).name === 'AbortError') return
      }
    }
  }

  // Fallback: download the image
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
