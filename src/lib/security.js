/**
 * Security & Sanitization Utilities for NITEK CHECKIN
 */

// ── Sanitize text input to prevent XSS attacks ──────────────────────────
export function sanitizeText(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove <script> tags
    .replace(/[<>]/g, '') // Remove dangerous angle brackets
    .trim();
}

// ── Compress webcam photo to lightweight 320px JPEG (quality 0.7) ───────
export function compressWebcamSnapshot(videoElement, maxWidth = 320, quality = 0.7) {
  if (!videoElement || !videoElement.videoWidth) return null;

  try {
    const canvas = document.createElement('canvas');
    const aspectRatio = videoElement.videoHeight / videoElement.videoWidth;
    canvas.width = maxWidth;
    canvas.height = Math.round(maxWidth * aspectRatio);

    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  } catch (err) {
    console.error('Error compressing webcam snapshot:', err);
    return null;
  }
}
