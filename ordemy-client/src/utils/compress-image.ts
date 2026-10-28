const PROFILE_IMAGE_MAX_BYTES = 1024 * 1024;
const PROFILE_IMAGE_MAX_DIMENSION = 1600;

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Your image could not be compressed."));
      },
      "image/jpeg",
      quality,
    );
  });
}

export async function compressProfileImage(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("This image could not be opened. Try another image.");
  }

  try {
    const scale = Math.min(
      1,
      PROFILE_IMAGE_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
    );
    let width = Math.max(1, Math.round(bitmap.width * scale));
    let height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image compression is not supported by this browser.");

    for (let attempt = 0; attempt < 18; attempt += 1) {
      canvas.width = width;
      canvas.height = height;
      context.fillStyle = "#fff";
      context.fillRect(0, 0, width, height);
      context.drawImage(bitmap, 0, 0, width, height);

      const quality = Math.max(0.4, 0.88 - Math.floor(attempt / 3) * 0.1);
      const blob = await canvasToJpegBlob(canvas, quality);
      if (blob.size <= PROFILE_IMAGE_MAX_BYTES) {
        return new File([blob], "profile-image.jpg", {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
      }

      if ((attempt + 1) % 3 === 0) {
        width = Math.max(1, Math.floor(width * 0.8));
        height = Math.max(1, Math.floor(height * 0.8));
      }
    }

    throw new Error("This image could not be compressed below 1 MB. Try a smaller image.");
  } finally {
    bitmap.close();
  }
}
