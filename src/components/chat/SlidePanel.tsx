/**
 * SlidePanel - Reusable slide-in panel component
 */

import React, { useEffect } from 'react';

import './SlidePanel.css';

interface SlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  side?: 'left' | 'right';
}

const SlidePanel: React.FC<SlidePanelProps> = ({
  isOpen,
  onClose,
  title,
  children,
  side = 'right',
}) => {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="slide-panel-overlay" onClick={onClose}>
      <div
        className={`slide-panel slide-panel--${side}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="slide-panel-header">
          <h2 className="slide-panel-title">{title}</h2>
          <button
            className="slide-panel-close"
            onClick={onClose}
            aria-label="Close panel"
          >
            ✕
          </button>
        </div>
        <div className="slide-panel-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default SlidePanel;