// 휴대폰·카카오톡 원본 사진은 3MB를 쉽게 넘고 10MB도 넘는다. 파트너스 병원 사진과
// 같은 방식으로, 큰 JPG/PNG 사진은 업로드 전에 브라우저에서 긴 변 2560px JPEG로 줄인다.
// (PDF·GIF·PPT는 그대로 올린다.)
const SHRINKABLE_TYPES = ["image/jpeg", "image/png"];
const RESIZE_THRESHOLD_BYTES = 3 * 1024 * 1024;
const MAX_DIMENSION = 2560;
const JPEG_QUALITIES = [0.86, 0.78, 0.7];

export function isShrinkablePhoto(file: { type: string }) {
  return SHRINKABLE_TYPES.includes(file.type);
}

export function formatMegabytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function fitWithin(width: number, height: number, maxDimension: number) {
  const longest = Math.max(width, height);
  if (longest <= maxDimension) return { width, height };
  const scale = maxDimension / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

// 줄일 필요가 없거나 줄일 수 없는 파일은 그대로 돌려준다. 줄인 뒤에도 maxBytes를
// 넘으면 실제 용량을 알려 주는 오류를 낸다.
export async function shrinkPhotoForUpload(file: File, maxBytes: number): Promise<File> {
  if (!isShrinkablePhoto(file) || file.size <= Math.min(RESIZE_THRESHOLD_BYTES, maxBytes)) {
    return file;
  }
  const resized = await resizeToJpeg(file, maxBytes).catch(() => null);
  if (resized && resized.size < file.size && resized.size <= maxBytes) return resized;
  if (file.size <= maxBytes) return file;
  throw new Error(
    `${file.name} 사진 용량이 ${formatMegabytes(file.size)}라 올릴 수 없습니다. ${formatMegabytes(maxBytes).replace(".0MB", "MB")} 이하로 다시 선택해 주세요.`,
  );
}

async function resizeToJpeg(file: File, maxBytes: number): Promise<File | null> {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
    return null;
  }
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    let maxDimension = MAX_DIMENSION;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { width, height } = fitWithin(bitmap.width, bitmap.height, maxDimension);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) return null;
      // PNG 투명 영역이 JPEG에서 검게 나오지 않도록 흰 배경을 깐다.
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(bitmap, 0, 0, width, height);
      for (const quality of JPEG_QUALITIES) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", quality),
        );
        if (blob && blob.size <= maxBytes) {
          return new File([blob], jpegFileName(file.name), {
            type: "image/jpeg",
            lastModified: file.lastModified,
          });
        }
      }
      maxDimension = Math.round(maxDimension * 0.75);
    }
    return null;
  } finally {
    bitmap.close();
  }
}

function jpegFileName(name: string) {
  const base = name.replace(/\.[^.]+$/, "");
  return `${base || "photo"}.jpg`;
}
