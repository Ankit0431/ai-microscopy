import { useEffect, useState } from 'react';

const Toast = ({ message, type = 'info', duration = 5000, onClose, onExit }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      if (onExit) onExit();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onExit]);

  if (!isVisible) return null;

  const handleClose = () => {
    setIsExiting(true);
    if (onExit) onExit();
  };

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-gradient-to-r from-green-600 to-green-800',
          border: 'border-green-500',
          icon: '✓',
          iconBg: 'bg-green-500'
        };
      case 'error':
        return {
          bg: 'bg-gradient-to-r from-red-600 to-red-800',
          border: 'border-red-500',
          icon: '✕',
          iconBg: 'bg-red-500'
        };
      case 'warning':
        return {
          bg: 'bg-gradient-to-r from-yellow-600 to-yellow-800',
          border: 'border-yellow-500',
          icon: '⚠',
          iconBg: 'bg-yellow-500'
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-blue-600 to-blue-800',
          border: 'border-blue-500',
          icon: 'ℹ',
          iconBg: 'bg-blue-500'
        };
    }
  };

  const styles = getToastStyles();

  return (
    <div className={`relative ${styles.bg} ${styles.border} border-2 rounded-xl shadow-2xl backdrop-blur-lg overflow-hidden ${isExiting ? 'toast-exit' : ''}`}>
      <div className="relative z-10 flex items-center p-4 pr-12">
        <div className={`w-8 h-8 ${styles.iconBg} rounded-full flex items-center justify-center text-white font-bold text-sm mr-3 shadow-lg`}>
          {styles.icon}
        </div>
        <div className="flex-1">
          <p className="text-white font-medium text-sm leading-tight">
            {message}
          </p>
        </div>
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 w-6 h-6 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white/80 hover:text-white transition-all duration-200 backdrop-blur-sm"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      <div 
        className="absolute bottom-0 left-0 h-1 bg-white/30 origin-left"
        style={{ 
          width: '100%',
          animation: `progressBar ${duration / 1000}s linear forwards`
        }}
      />
    </div>
  );
};

export default Toast;
