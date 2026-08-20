/**
 * Utility for safe View Transitions API invocation with graceful fallback
 */
export function safeViewTransition(updateCallback) {
  if (typeof document !== 'undefined' && 'startViewTransition' in document) {
    return document.startViewTransition(updateCallback);
  }
  return Promise.resolve(updateCallback());
}

/**
 * Attaches a dynamic spotlight cursor tracker to a DOM container
 */
export function attachSpotlight(element) {
  if (!element) return () => {};

  const handlePointerMove = (e) => {
    const rect = element.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    element.style.setProperty('--spotlight-x', `${x}px`);
    element.style.setProperty('--spotlight-y', `${y}px`);
    element.style.setProperty('--spotlight-opacity', '1');
  };

  const handlePointerLeave = () => {
    element.style.setProperty('--spotlight-opacity', '0');
  };

  element.addEventListener('pointermove', handlePointerMove, { passive: true });
  element.addEventListener('pointerleave', handlePointerLeave, { passive: true });

  return () => {
    element.removeEventListener('pointermove', handlePointerMove);
    element.removeEventListener('pointerleave', handlePointerLeave);
  };
}
