import { Share } from '@capacitor/share';

/**
 * Triggers a browser/WebView download for a Blob and releases the object URL safely.
 */
export function saveBlobAsFile(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Shares a Blob using Web Share API Level 2 (files), Capacitor Share text fallback,
 * or saves the file locally when native file sharing is unavailable.
 */
export async function shareOrSaveBlob(
  blob: Blob,
  fileName: string,
  title: string,
  text: string
): Promise<'shared' | 'saved'> {
  try {
    const file = new File([blob], fileName, { type: blob.type || 'application/octet-stream' });
    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title,
        text,
      });
      return 'shared';
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return 'shared';
    }
  }

  // Always avoid passing raw data: URLs to Capacitor Share on Android (causes Intent crash).
  saveBlobAsFile(blob, fileName);

  try {
    const canShareCheck = await Share.canShare();
    if (canShareCheck.value && blob.type.startsWith('text/')) {
      const content = await blob.text();
      await Share.share({
        title,
        text: content.slice(0, 4000),
        dialogTitle: title,
      });
      return 'shared';
    }
  } catch {
    // Fallback already saved the file
  }

  return 'saved';
}
