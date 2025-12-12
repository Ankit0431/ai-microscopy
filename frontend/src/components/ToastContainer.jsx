import { useState, useCallback, useEffect } from 'react';
import Toast from './Toast';

const ToastContainer = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [isAddingToast, setIsAddingToast] = useState(false);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, isExiting: true } : toast
    ));
    
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 300);
  }, []);

  const addToast = useCallback(({ message, type = 'info', duration = 5000 }) => {
    if (isAddingToast) {
      return null;
    }

    const id = Date.now() + Math.random();
    const timestamp = Date.now();
    const newToast = { id, message, type, duration, timestamp, isExiting: false };
    
    setIsAddingToast(true);
    
    setToasts(prev => {
      const now = Date.now();
      const existingToast = prev.find(toast => 
        toast.message === message && 
        toast.type === type && 
        (now - toast.timestamp) < 2000
      );
      
      if (existingToast) {
        setIsAddingToast(false);
        return prev;
      }
      
      return [...prev, newToast];
    });
    
    setTimeout(() => {
      setIsAddingToast(false);
    }, 100);
    
    setTimeout(() => {
      removeToast(id);
    }, duration);
    
    return id;
  }, [removeToast, isAddingToast]);

  if (typeof window !== 'undefined' && !window.showToast) {
    window.showToast = (toastData) => {
      return addToast(toastData);
    };
  }
  
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.showToast) {
      window.showToast = (toastData) => {
        return addToast(toastData);
      };
    }
  }, [addToast]);

  return (
    <>
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] space-y-3 pointer-events-none">
        {toasts.map((toast, index) => {
          return (
            <div
              key={toast.id}
              className={`toast-animation ${toast.isExiting ? 'toast-exit' : ''}`}
              style={{
                zIndex: 9999 - index,
                pointerEvents: 'auto',
                transformOrigin: 'center top'
              }}
            >
              <Toast
                message={toast.message}
                type={toast.type}
                duration={toast.duration}
                onClose={() => removeToast(toast.id)}
                onExit={() => {
                  setToasts(prev => prev.map(t => 
                    t.id === toast.id ? { ...t, isExiting: true } : t
                  ));
                }}
              />
            </div>
          );
        })}
      </div>
      {children}
    </>
  );
};

export default ToastContainer;
