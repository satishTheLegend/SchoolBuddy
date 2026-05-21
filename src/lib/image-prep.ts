// Client-side image pre-processing before upload.
// Cuts OCR token cost (vision pricing scales with megapixels) and
// improves OCR quality on small text.
//
// True perspective correction needs a vision-CV module (e.g.
// `vision-camera-document-scanner`). What we do here is the cheap
// 80%-as-good version that runs everywhere expo-image-manipulator
// runs.

import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

const TARGET_LONG_EDGE = 1600;

export interface PreparedImage {
  uri: string;
  width: number;
  height: number;
  size: number;
  mime: 'image/jpeg';
}

/**
 * Down-sample + JPEG-compress an image to a sensible OCR-ready form.
 * Returns the new uri plus actual dimensions/size for analytics.
 */
export async function prepareForUpload(localUri: string): Promise<PreparedImage> {
  // Discover original size first so we don't enlarge small photos.
  const info = await FileSystem.getInfoAsync(localUri, { size: true });
  const probe = await ImageManipulator.manipulateAsync(localUri, [], {
    base64: false,
  });
  const longEdge = Math.max(probe.width, probe.height);
  const ops: ImageManipulator.Action[] = [];
  if (longEdge > TARGET_LONG_EDGE) {
    if (probe.width >= probe.height) {
      ops.push({ resize: { width: TARGET_LONG_EDGE } });
    } else {
      ops.push({ resize: { height: TARGET_LONG_EDGE } });
    }
  }

  const result = await ImageManipulator.manipulateAsync(localUri, ops, {
    compress: 0.82,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  const out = await FileSystem.getInfoAsync(result.uri, { size: true });
  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    size: out.exists && 'size' in out ? out.size : info.exists && 'size' in info ? info.size : 0,
    mime: 'image/jpeg',
  };
}

/**
 * Manual crop given user-selected pixel bounds. Used by the (future)
 * crop-confirm UI.
 */
export async function cropTo(
  localUri: string,
  bounds: { originX: number; originY: number; width: number; height: number },
): Promise<string> {
  const r = await ImageManipulator.manipulateAsync(
    localUri,
    [{ crop: bounds }],
    { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG },
  );
  return r.uri;
}
