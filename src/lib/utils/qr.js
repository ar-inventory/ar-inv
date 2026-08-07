/**
 * qr.js — Generate QR Code sebagai data URL (PNG/SVG)
 * Menggunakan library `qrcode` yang sudah terinstall
 */

let QRCode = null;

async function getQR() {
  if (QRCode) return QRCode;
  QRCode = (await import('qrcode')).default;
  return QRCode;
}

/**
 * Generate QR code sebagai data URL PNG
 * @param {string} text - payload QR (misal: "INV-uuid")
 * @param {number} size - ukuran pixel
 * @returns {Promise<string>} data URL
 */
export async function generateQRDataURL(text, size = 200) {
  const QR = await getQR();
  return QR.toDataURL(text, {
    width: size,
    margin: 2,
    color: { dark: '#1a1d27', light: '#ffffff' }
  });
}

/**
 * Generate QR code sebagai SVG string
 */
export async function generateQRSVG(text, size = 200) {
  const QR = await getQR();
  return QR.toString(text, { type: 'svg', width: size, margin: 2 });
}

/**
 * Download QR code sebagai PNG
 */
export async function downloadQR(text, filename = 'qrcode') {
  const dataUrl = await generateQRDataURL(text, 400);
  const a = document.createElement('a');
  a.href     = dataUrl;
  a.download = `${filename}.png`;
  a.click();
}
