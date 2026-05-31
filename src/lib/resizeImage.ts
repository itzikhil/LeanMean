/**
 * Resize an image file to fit within maxDim (longest side) and compress as JPEG.
 * Returns a data-URI string (data:image/jpeg;base64,...).
 */
export function resizeImage(file: File, maxDim = 1024, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
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
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      const dataUri = canvas.toDataURL('image/jpeg', quality)
      resolve(dataUri)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}
