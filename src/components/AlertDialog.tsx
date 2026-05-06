// Clean AlertDialog component (UI-only)

import React, { useEffect } from 'react';

interface AlertDialogProps {
  message: string;
  isOpen: boolean;
  onClose: () => void;
  type?: 'error' | 'success' | 'info';
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  message,
  isOpen,
  onClose,
  type = 'error',
}) => {
  // Handle Enter key to close dialog only when open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          borderColor: '#4caf50',
          backgroundColor: '#f1f8f4',
          titleColor: '#2e7d32',
          iconColor: '#4caf50',
          buttonColor: '#4caf50',
        };
      case 'info':
        return {
          borderColor: '#2196f3',
          backgroundColor: '#f0f8ff',
          titleColor: '#1565c0',
          iconColor: '#2196f3',
          buttonColor: '#2196f3',
        };
      case 'error':
      default:
        return {
          borderColor: '#f44336',
          backgroundColor: '#fff8f7',
          titleColor: '#c62828',
          iconColor: '#f44336',
          buttonColor: '#f44336',
        };
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <div style={styles.overlay}>
      <div
        style={{
          ...styles.dialog,
          borderLeftColor: typeStyles.borderColor,
          backgroundColor: typeStyles.backgroundColor,
        }}
      >
        <div style={styles.dialogHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22, color: typeStyles.iconColor }}>
              {type === 'error' ? '⚠️' : type === 'success' ? '✓' : 'ℹ️'}
            </span>
            <h2 style={{ ...styles.title, color: typeStyles.titleColor }}>
              {type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Info'}
            </h2>
          </div>
        </div>

        <div style={styles.message}>{message}</div>

        <div style={styles.footer}>
          <button
            onClick={onClose}
            style={{ ...styles.button, backgroundColor: typeStyles.buttonColor }}
          >
            OK (Enter)
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  } as React.CSSProperties,

  dialog: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #ddd',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
    borderLeft: '4px solid',
    maxWidth: '450px',
    width: '90%',
    padding: '16px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  } as React.CSSProperties,

  dialogHeader: {
    marginBottom: '12px',
  } as React.CSSProperties,

  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
  } as React.CSSProperties,

  message: {
    fontSize: '14px',
    color: '#333',
    marginBottom: '16px',
    lineHeight: '1.5',
    wordWrap: 'break-word' as const,
  } as React.CSSProperties,

  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
  } as React.CSSProperties,

  button: {
    padding: '8px 16px',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
  } as React.CSSProperties,
};

export default AlertDialog;
