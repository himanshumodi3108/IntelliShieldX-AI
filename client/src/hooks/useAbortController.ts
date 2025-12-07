import { useEffect, useRef } from "react";

/**
 * Custom hook to manage AbortController for cancelling fetch requests
 * Automatically aborts previous requests when component unmounts or new request is made
 */
export function useAbortController() {
  const abortControllerRef = useRef<AbortController | null>(null);

  const getAbortSignal = () => {
    // Abort previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController
    abortControllerRef.current = new AbortController();
    return abortControllerRef.current.signal;
  };

  useEffect(() => {
    return () => {
      // Cleanup: abort any pending requests on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { getAbortSignal };
}


