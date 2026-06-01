/**
 * Resize an image file to fit within maxDim (longest side) and compress as JPEG.
 * Returns a data-URI string (data:image/jpeg;base64,...).
 * Uses createImageBitmap for reliable HEIC/iOS decoding, with canvas fallback.
 */
export async function resizeImage(file: File, maxDim = 1024, quality = 0.8): Promise<string> {
  console.log('[resize] start — createImageBitmap…')
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
    console.log('[resize] createImageBitmap done:', bitmap.width, '×', bitmap.height)
  } catch (e) {
    console.warn('[resize] createImageBitmap FAILED, falling back to Image element:', e)
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
  console.log('[resize] target size:', width, '×', height)

  console.log('[resize] canvas getContext…')
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    console.error('[resize] getContext returned null')
    throw new Error('Canvas 2D context unavailable (device memory limit)')
  }
  console.log('[resize] drawImage…')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  console.log('[resize] toDataURL…')
  const dataUri = canvas.toDataURL('image/jpeg', quality)
  console.log('[resize] toDataURL result length:', dataUri.length)
  if (!dataUri || dataUri.length < 100) {
    console.error('[resize] toDataURL returned empty/short string')
    throw new Error('Canvas export failed (image too large for device)')
  }

  console.log('[resize] done OK')
  return dataUri
}

/** Fallback using Image element (for browsers without createImageBitmap). */
function imageElementResize(file: File, maxDim: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log('[resize-fallback] start — Image element…')
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      try {
        let { width, height } = img
        console.log('[resize-fallback] loaded:', width, '×', height)
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
        console.log('[resize-fallback] toDataURL length:', dataUri.length)
        if (!dataUri || dataUri.length < 100) { reject(new Error('Canvas export failed')); return }
        resolve(dataUri)
      } catch (e) {
        console.error('[resize-fallback] error:', e)
        reject(e instanceof Error ? e : new Error('Image resize failed'))
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      console.error('[resize-fallback] Image decode failed:', file.type)
      reject(new Error(`Image decode failed (format: ${file.type || 'unknown'})`))
    }
    img.src = url
  })
}
