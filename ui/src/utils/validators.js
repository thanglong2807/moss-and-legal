export const sortIndustriesByCode = (arr) =>
  [...arr].sort((a, b) => {
    if (!a.code && !b.code) return 0;
    if (!a.code) return 1;
    if (!b.code) return -1;
    return a.code.localeCompare(b.code, undefined, { numeric: true });
  });

export const validatePhone = (phone) => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits.startsWith('0')) return 'error';
  if (digits.length < 10 || digits.length > 11) return 'error';
  if (digits.length === 11) return 'warn';
  return null;
};

export const validateEmail = (email) => {
  if (!email) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? null : 'error';
};

/**
 * Compress an image File before upload.
 * - Resizes to maxPx on the longest side
 * - Re-encodes as JPEG at given quality (0-1)
 * - Returns original file unchanged if it's already small or is a PDF
 */
export const compressImage = (file, { maxPx = 1200, quality = 0.82 } = {}) =>
  new Promise((resolve) => {
    if (file.type === 'application/pdf' || file.size < 300_000) {
      resolve(file);
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        const ratio = Math.min(maxPx / width, maxPx / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
        },
        'image/jpeg',
        quality,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
