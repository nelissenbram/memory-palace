import * as THREE from "three";

export type BustStyle = "roman" | "renaissance";

/**
 * Takes a face image and composites it into a bust-like texture.
 * Roman: white marble overlay. Renaissance: dark bronze patina overlay.
 */
export async function createBustTexture(
  faceImage: HTMLImageElement,
  style: BustStyle
): Promise<THREE.CanvasTexture> {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Background fill based on style
  ctx.fillStyle = style === "roman" ? "#E8E0D4" : "#6A5840";
  ctx.fillRect(0, 0, size, size);

  // Crop face to oval/circle
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(size / 2, size / 2 - 20, size * 0.35, size * 0.42, 0, 0, Math.PI * 2);
  ctx.clip();

  // Draw face centered
  const imgAspect = faceImage.width / faceImage.height;
  let drawW = size * 0.8;
  let drawH = drawW / imgAspect;
  if (drawH < size * 0.9) {
    drawH = size * 0.9;
    drawW = drawH * imgAspect;
  }
  ctx.drawImage(faceImage, (size - drawW) / 2, (size - drawH) / 2 - 20, drawW, drawH);
  ctx.restore();

  // Desaturate to grayscale
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
  ctx.putImageData(imageData, 0, 0);

  // Apply material overlay via multiply blend
  ctx.globalCompositeOperation = "multiply";
  if (style === "roman") {
    // Marble white with warm tint
    ctx.fillStyle = "#F0EBE0";
    ctx.fillRect(0, 0, size, size);
  } else {
    // Bronze patina — dark warm tone
    ctx.fillStyle = "#8A7050";
    ctx.fillRect(0, 0, size, size);
  }
  ctx.globalCompositeOperation = "source-over";

  // Sculptural edge shadow — vignette
  const gradient = ctx.createRadialGradient(size / 2, size / 2, size * 0.25, size / 2, size / 2, size * 0.5);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(0.7, "rgba(0,0,0,0)");
  gradient.addColorStop(1, style === "roman" ? "rgba(180,170,150,0.6)" : "rgba(60,50,40,0.7)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Load an image from a URL and return an HTMLImageElement.
 */
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
