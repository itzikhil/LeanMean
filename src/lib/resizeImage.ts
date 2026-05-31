/**
 * Resize an image file to fit within maxDim (longest side) and compress as JPEG.
 * Returns a data-URI string (data:image/jpeg;base64,...).
 * Uses createImageBitmap for reliable HEIC/iOS decoding, with canvas fallback.
 */
export async function resizeImage(file: File, maxDim = 1024, quality = 0.8): Promise<string> {
  // Decode the image — createImageBitmap handles HEIC, JPEG, PNG natively on iOS/Safari
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch (e) {
    // If createImageBitmap fails (very old browser), try Image element path
    return imageElementResize(file, maxDim, quality)
  }

  let { width, height } = bitmap
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
    bitmap.close()
    throw new Error('Canvas 2D context unavailable (device memory limit)')
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const dataUri = canvas.toDataURL('image/jpeg', quality)
  // iOS returns "data:," or very short string on canvas memory overflow
  if (!dataUri || dataUri.length < 100) {
    throw new Error('Canvas export failed (image too large for device)')
  }

  return dataUri
}

/** Fallback using Image element (for browsers without createImageBitmap). */
function imageElementResize(file: File, maxDim: number, quality: number): Promise<string> {
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
        if (!ctx) { reject(new Error('Canvas context unavailable')); return }
        ctx.drawImage(img, 0, 0, width, height)
        const dataUri = canvas.toDataURL('image/jpeg', quality)
        if (!dataUri || dataUri.length < 100) { reject(new Error('Canvas export failed')); return }
        resolve(dataUri)
      } catch (e) {
        reject(e instanceof Error ? e : new Error('Image resize failed'))
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`Image decode failed (format: ${file.type || 'unknown'})`))
    }
    img.src = url
  })
}
