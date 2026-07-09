import { type Dimension } from "../model/types";

export const MIN_IMAGE_SIDE = 200;
const MAX_ENCODED_SIDE = 1024;
const ENCODED_TYPE = "image/webp";
const ENCODED_QUALITY = 0.8;

export interface ImportedImage {
  src: string;
  width: number;
  height: number;
}

export async function importImage(file: File): Promise<ImportedImage> {
  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    // Do not compress SVGs or GIFs
    return embedOriginalImage(file);
  }

  try {
    return await compressImage(file);
  } catch (error) {
    // Try to embed the original image if compression fails
    return embedOriginalImage(file);
  }
}

async function compressImage(file: File): Promise<ImportedImage> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(
      1,
      MAX_ENCODED_SIDE / Math.min(bitmap.width, bitmap.height),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not get 2d canvas context");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, ENCODED_TYPE, ENCODED_QUALITY),
    );
    if (!blob) throw new Error("Could not encode image");

    const src = await readAsDataUrl(blob);
    return { src, width: canvas.width, height: canvas.height };
  } finally {
    bitmap.close();
  }
}

async function embedOriginalImage(file: File): Promise<ImportedImage> {
  const src = await readAsDataUrl(file);
  const { width, height } = await measureImage(src);
  return { src, width, height };
}

async function measureImage(src: string): Promise<Dimension> {
  const image = new Image();
  image.src = src;
  await image.decode();
  return {
    width: image.naturalWidth || MIN_IMAGE_SIDE,
    height: image.naturalHeight || MIN_IMAGE_SIDE,
  };
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function displayDimension(size: Dimension): Dimension {
  const scale = MIN_IMAGE_SIDE / Math.min(size.width, size.height);
  return {
    width: Math.round(size.width * scale),
    height: Math.round(size.height * scale),
  };
}
