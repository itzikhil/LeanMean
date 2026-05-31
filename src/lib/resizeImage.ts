/**
 * Resize an image file to fit within maxDim (longest side) and compress as JPEG.
 * Returns a data-URI string (data:image/jpeg;base64,...).
 * Falls back to raw FileReader dataURL if canvas operations fail (e.g. iOS memory limits).
 */
export function resizeImage(file: File, maxDim = 1024, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      try {
        let { width, height } = img
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round(height * (maxDim / width))
            width = maxDim
          } else {
            width = Math.round(width * (maxDim / height))
            height = maxDim
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          // Canvas context unavailable (memory pressure on mobile)
          fallbackRead(file).then(resolve, reject)
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        const dataUri = canvas.toDataURL('image/jpeg', quality)
        // iOS can return empty "data:," on canvas overflow
        if (!dataUri || dataUri.length < 50) {
          fallbackRead(file).then(resolve, reject)
          return
        }
        resolve(dataUri)
      } catch {
        // Any canvas/draw error: fall back to raw file read
        fallbackRead(file).then(resolve, reject)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      // Image failed to decode; fall back to raw read so the server still gets something
      fallbackRead(file).then(resolve, reject)
    }
    img.src = url
  })
}

/** Read file as data-URI without any resize (last resort). */
function fallbackRead(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read image file'))
    reader.readAsDataURL(file)
  })
}
