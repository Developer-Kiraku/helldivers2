'use client';
import { useState } from 'react';
import { equipmentForId, equipmentGroups } from '@/lib/equipment.mjs';
import { EquipmentIcon } from './EquipmentIcon';
import { Button } from './ui';
import Modal from './Modal';

export default function EquipmentDetails({ id, disabled = false, cardLabel }) {
  const [open, setOpen] = useState(false);
  const item = equipmentForId(id);
  const details = item?.details;
  const armor = item?.group === 'armor';
  if (!item || (!armor && !details)) return null;
  const group = equipmentGroups.find(([key]) => key === item.group)?.[1];
  const checkedAt = armor ? item.descriptionCheckedAt : details.checkedAt;
  const source = armor ? item.descriptionSource : details.source;
  const summary = armor ? item.description : details.summary;
  return (
    <>
      <Button
        type="button"
        className={`armor-details-button${cardLabel ? ' armor-details-card-trigger' : ''}`}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${cardLabel && cardLabel !== item.label ? `${cardLabel} · ` : ''}${item.label} 옵션 설명`}
        onClick={() => setOpen(true)}
      >
        {cardLabel ? '옵션 보기' : '옵션 설명'}
      </Button>
      {open && (
        <Modal title={`${item.label} · ${group}`} onClose={() => setOpen(false)}>
          <div className="armor-details equipment-details">
            <EquipmentIcon item={item} />
            {!!details?.traits.length && (
              <ul className="equipment-detail-traits" aria-label="장비 특성">
                {details.traits.map((trait) => (
                  <li key={trait}>{trait}</li>
                ))}
              </ul>
            )}
            {summary && <p>{summary}</p>}
            {!!details?.stats.length && (
              <dl className="equipment-detail-stats" aria-label="장비 성능">
                {details.stats.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {details?.note && <p className="equipment-detail-note">{details.note}</p>}
            <small>
              {checkedAt} 자료 확인 ·{' '}
              <a href={source} target="_blank" rel="noopener noreferrer">
                {armor ? '효과 출처' : '한국어 자료'}
              </a>
              {details?.additionalSource && (
                <>
                  {' '}
                  ·{' '}
                  <a href={details.additionalSource} target="_blank" rel="noopener noreferrer">
                    성능 자료
                  </a>
                </>
              )}
            </small>
          </div>
        </Modal>
      )}
    </>
  );
}
