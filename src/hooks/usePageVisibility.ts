import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook to detect page visibility changes using the Page Visibility API.
 * Helps prevent glitches on mobile when screen dims or device is locked.
 * 
 * @returns {object} - { isVisible, wasHidden, lastVisibleTime }
 * - isVisible: Current visibility state
 * - wasHidden: True if page was recently hidden (for triggering refreshes)
 * - lastVisibleTime: Timestamp when page became visible again
 */
export function usePageVisibility() {
    const [isVisible, setIsVisible] = useState(true);
    const [wasHidden, setWasHidden] = useState(false);
    const [lastVisibleTime, setLastVisibleTime] = useState<number>(Date.now());
    const hiddenDurationRef = useRef<number>(0);
    const hiddenAtRef = useRef<number | null>(null);

    useEffect(() => {
        // Handle browser prefixes for visibility API
        const hidden = 'hidden';
        const visibilityChange = 'visibilitychange';

        const handleVisibilityChange = () => {
            const nowHidden = document.hidden;

            if (nowHidden) {
                // Page is being hidden
                hiddenAtRef.current = Date.now();
                setIsVisible(false);
            } else {
                // Page is becoming visible again
                if (hiddenAtRef.current) {
                    hiddenDurationRef.current = Date.now() - hiddenAtRef.current;
                }
                hiddenAtRef.current = null;
                setIsVisible(true);
                setWasHidden(true);
                setLastVisibleTime(Date.now());

                // Reset wasHidden after a short delay (allows components to react)
                setTimeout(() => setWasHidden(false), 100);
            }
        };

        // Set initial state
        setIsVisible(!document.hidden);

        // Add event listener
        document.addEventListener(visibilityChange, handleVisibilityChange);

        return () => {
            document.removeEventListener(visibilityChange, handleVisibilityChange);
        };
    }, []);

    /**
     * Get duration the page was hidden (in milliseconds)
     */
    const getHiddenDuration = useCallback(() => {
        return hiddenDurationRef.current;
    }, []);

    return {
        isVisible,
        wasHidden,
        lastVisibleTime,
        getHiddenDuration,
    };
}

/**
 * Hook for visibility-aware intervals that pause when page is hidden.
 * Prevents timer accumulation and glitches on mobile browsers.
 * 
 * @param callback - Function to call on each interval
 * @param delay - Interval delay in milliseconds
 * @param deps - Dependencies array for the callback
 */
export function useVisibilityAwareInterval(
    callback: () => void,
    delay: number,
    deps: React.DependencyList = []
) {
    const { isVisible, wasHidden } = usePageVisibility();
    const savedCallback = useRef(callback);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Remember the latest callback
    useEffect(() => {
        savedCallback.current = callback;
    }, [callback, ...deps]);

    // Set up the interval
    useEffect(() => {
        // Clear any existing interval
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        // Only run interval when visible
        if (isVisible && delay !== null) {
            // If we were just hidden, immediately call the callback to sync state
            if (wasHidden) {
                savedCallback.current();
            }

            intervalRef.current = setInterval(() => {
                savedCallback.current();
            }, delay);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isVisible, wasHidden, delay]);
}

export default usePageVisibility;
