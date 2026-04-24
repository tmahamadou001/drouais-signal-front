export const compressImage = async (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const MAX = 1200
      let w = img.width
      let h = img.height
      
      if (w > MAX || h > MAX) {
        if (w > h) {
          h = (h * MAX) / w
          w = MAX
        } else {
          w = (w * MAX) / h
          h = MAX
        }
      }
      
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
            resolve(compressedFile)
          } else {
            resolve(file)
          }
        },
        'image/jpeg',
        0.85
      )
      
      URL.revokeObjectURL(url)
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }
    
    img.src = url
  })
}