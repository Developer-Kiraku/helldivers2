'use client';

import { useEffect, useRef } from 'react';
import Icon from './Icon';

export default function Modal({ title, children, footer, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    element.showModal();
    return () => { element.close(); previous?.focus?.(); };
  }, []);
  return <dialog ref={dialog} className="modal" aria-labelledby="modal-heading" onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className="modal-header"><h2 id="modal-heading">{title}</h2><button className="icon-button" onClick={onClose} aria-label="닫기"><Icon name="close" /></button></header>
    <div className="modal-body">{children}</div>{footer && <footer className="modal-footer">{footer}</footer>}
  </dialog>;
}
