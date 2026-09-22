'use client';

import { useEffect } from 'react';

/**
 * Guarantees a generated object URL is revoked when the owning component
 * unmounts (and when the URL is replaced). Processed-document blobs are
 * large; without this, navigating away from a workspace without resetting
 * it keeps the blob alive for the rest of the session.
 *
 * Revoking an already-revoked URL is a harmless no-op, so this composes
 * safely with workspaces that also revoke in their reset/reassignment
 * logic.
 */
export function useRevokeOnUnmount(url: string | null | undefined): void {
  useEffect(() => {
    if (!url) return;
    return () => URL.revokeObjectURL(url);
  }, [url]);
}
