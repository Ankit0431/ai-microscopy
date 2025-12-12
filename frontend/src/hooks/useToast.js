import { useCallback } from 'react';

const useToast = () => {
  const showToast = useCallback(({ message, type = 'info', duration = 5000 }) => {
    if (typeof window !== 'undefined' && window.showToast) {
      return window.showToast({ message, type, duration });
    }
    
    console.log(`[${type.toUpperCase()}] ${message}`);
    console.warn('Toast system not available, message logged to console');
    
    return null;
  }, []);

  const success = useCallback((message, duration = 5000) => {
    console.log('useToast.success called with:', { message, duration });
    const result = showToast({ message, type: 'success', duration });
    console.log('useToast.success result:', result);
    return result;
  }, [showToast]);

  const error = useCallback((message, duration = 5000) => {
    return showToast({ message, type: 'error', duration });
  }, [showToast]);

  const warning = useCallback((message, duration = 5000) => {
    return showToast({ message, type: 'warning', duration });
  }, [showToast]);

  const info = useCallback((message, duration = 5000) => {
    return showToast({ message, type: 'info', duration });
  }, [showToast]);

  return {
    showToast,
    success,
    error,
    warning,
    info
  };
};

export default useToast;
export { useToast }; 