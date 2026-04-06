import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface WindowPortalProps {
  windowRef: React.RefObject<Window | null>;
  children: React.ReactNode;
  onClose: () => void;
}

function copyStyles(source: Document, target: Document) {
  const htmlStyle = source.documentElement.getAttribute('style');
  if (htmlStyle) {
    target.documentElement.setAttribute('style', htmlStyle);
  }

  source.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
    target.head.appendChild(link.cloneNode(true));
  });

  source.querySelectorAll('style').forEach((style) => {
    try {
      target.head.appendChild(style.cloneNode(true));
    } catch { /* cross-origin style, skip */ }
  });
}

export function WindowPortal({ windowRef, children, onClose }: WindowPortalProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    const popup = windowRef.current;
    if (!popup || popup.closed) {
      onCloseRef.current();
      return;
    }

    // Set up the popup document (idempotent — safe for StrictMode double-invoke)
    popup.document.title = 'Character Sheet — Lychgate VTT';
    // Replace about:blank with a cleaner URL in the address bar
    try {
      popup.history.replaceState(null, '', window.location.origin + '/#/character-sheet');
    } catch { /* cross-origin or security restriction, ignore */ }
    popup.document.body.style.margin = '0';
    popup.document.body.style.overflow = 'hidden';
    popup.document.body.style.background = '#1a1a2e';

    // Copy styles only once
    if (!popup.document.getElementById('character-sheet-root')) {
      copyStyles(document, popup.document);
    }

    // Create or reuse render container
    let div = popup.document.getElementById('character-sheet-root') as HTMLDivElement | null;
    if (!div) {
      div = popup.document.createElement('div');
      div.id = 'character-sheet-root';
      div.style.width = '100vw';
      div.style.height = '100vh';
      div.style.display = 'flex';
      div.style.flexDirection = 'column';
      popup.document.body.appendChild(div);
    }
    setContainer(div);

    // Watch for new styles in parent (Vite HMR)
    const observer = new MutationObserver((mutations) => {
      if (popup.closed) return;
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLStyleElement || (node instanceof HTMLLinkElement && node.rel === 'stylesheet')) {
            try {
              popup.document.head.appendChild(node.cloneNode(true));
            } catch { /* ignore */ }
          }
        }
      }
    });
    observer.observe(document.head, { childList: true });
    observerRef.current = observer;

    // Listen for popup close (user closes the window via browser X)
    const handlePopupUnload = () => {
      setTimeout(() => {
        if (popup.closed) {
          onCloseRef.current();
        }
      }, 100);
    };
    popup.addEventListener('beforeunload', handlePopupUnload);

    // Listen for parent close/refresh — clean up popup
    const handleParentUnload = () => {
      popup.close();
    };
    window.addEventListener('beforeunload', handleParentUnload);

    return () => {
      observer.disconnect();
      popup.removeEventListener('beforeunload', handlePopupUnload);
      window.removeEventListener('beforeunload', handleParentUnload);
      // Do NOT close the popup here — StrictMode double-invokes effects.
      // The popup is closed explicitly by SheetModal's handlers
      // (handleClose, handleSave, handlePopIn) or by the user closing it.
    };
  }, [windowRef]);

  if (!container) return null;
  return createPortal(children, container);
}
