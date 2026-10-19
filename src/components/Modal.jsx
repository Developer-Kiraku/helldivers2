'use client';
import {useRef} from 'react';
import {Dialog} from '@radix-ui/themes';
import Icon from './Icon';
import {Button} from './ui';
export default function Modal({title,children,footer,onClose,className='',onKeyDown}){
 const previous=useRef(typeof document==='undefined'?null:document.activeElement);
 return <Dialog.Root open onOpenChange={open=>{if(!open)onClose()}}>
  <Dialog.Content className={`modal ui-modal ${className}`} maxWidth="660px" aria-describedby={undefined} onKeyDown={onKeyDown} onCloseAutoFocus={event=>{event.preventDefault();previous.current?.isConnected&&previous.current.focus()}}>
   <header className="modal-header"><Dialog.Title mb="0" trim="normal">{title}</Dialog.Title><Button type="button" className="icon-button" onClick={onClose} aria-label="닫기"><Icon name="close"/></Button></header>
   <div className="modal-body">{children}</div>{footer&&<footer className="modal-footer">{footer}</footer>}
  </Dialog.Content>
 </Dialog.Root>;
}
