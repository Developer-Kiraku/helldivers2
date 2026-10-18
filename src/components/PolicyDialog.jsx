'use client';

import Modal from './Modal';
import { policies } from '@/lib/policies';

export default function PolicyDialog({ name, onClose }) {
  const policy = policies[name];
  if (!policy) return null;
  // This HTML is a checked-in legal draft, never user-provided HTML.
  return <Modal title={policy.title} onClose={onClose} footer={<button className="button primary" onClick={onClose}>확인</button>}><div className="policy-copy" dangerouslySetInnerHTML={{ __html: policy.body }} /></Modal>;
}
