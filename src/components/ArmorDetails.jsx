'use client';
import { useState } from 'react';
import { equipmentForId } from '@/lib/equipment.mjs';
import { EquipmentIcon } from './Equipment';
import { Button } from './ui';
import Modal from './Modal';

export default function ArmorDetails({ id, disabled = false }) {
  const [open, setOpen] = useState(false);
  const item = equipmentForId(id);
  if (item?.group !== 'armor') return null;
  return (
    <>
      <Button
        type="button"
        className="armor-details-button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${item.label} 옵션 설명`}
        onClick={() => setOpen(true)}
      >
        옵션 설명
      </Button>
      {open && (
        <Modal title={`${item.label} · 갑옷 옵션`} onClose={() => setOpen(false)}>
          <div className="armor-details">
            <EquipmentIcon item={item} />
            <p>{item.description || '효과 설명을 준비 중입니다.'}</p>
            <small>
              {item.descriptionCheckedAt} 기준 ·{' '}
              <a href={item.descriptionSource} target="_blank" rel="noopener noreferrer">
                효과 출처
              </a>
            </small>
          </div>
        </Modal>
      )}
    </>
  );
}
