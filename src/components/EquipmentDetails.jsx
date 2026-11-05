'use client';
import { useState } from 'react';
import { equipmentForId, equipmentGroupLabels } from '@/lib/equipment.mjs';
import { EquipmentIcon } from './EquipmentIcon';
import { Button } from './ui';
import Modal from './Modal';

export default function EquipmentDetails({ id, disabled = false, cardLabel }) {
  const [open, setOpen] = useState(false);
  const item = equipmentForId(id);
  const details = item?.details;
  if (!details) return null;
  const group = equipmentGroupLabels[item.group];
  const { checkedAt, source, summary, combat } = details;
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
            {!!details.traits.length && (
              <ul className="equipment-detail-traits" aria-label="장비 특성">
                {details.traits.map((trait) => (
                  <li key={trait}>{trait}</li>
                ))}
              </ul>
            )}
            {summary && <p>{summary}</p>}
            {!!details.stats.length && (
              <dl className="equipment-detail-stats" aria-label="장비 성능">
                {details.stats.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {details.note && <p className="equipment-detail-note">{details.note}</p>}
            {combat && (
              <section className="equipment-detail-combat" aria-label="관통력과 철거력">
                <table>
                  <caption>관통력 · 철거력</caption>
                  <thead>
                    <tr>
                      <th scope="col">공격 유형</th>
                      <th scope="col">관통력</th>
                      <th scope="col">철거력</th>
                    </tr>
                  </thead>
                  <tbody>
                    {combat.profiles.map(({ label, penetration, demolition }) => (
                      <tr key={label}>
                        <th scope="row">{label}</th>
                        <td>
                          {(penetration ?? '미확인').split(' · ').map((part) => (
                            <span key={part}>{part}</span>
                          ))}
                        </td>
                        <td>{demolition ?? '미확인'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="equipment-detail-note">
                  관통력은 정면 기준이며, 폭발은 범위별로 구분합니다. 철거력은 자료의 ‘철거 위력’
                  수치입니다.
                </p>
                {combat.note && <p className="equipment-detail-note">{combat.note}</p>}
                <small>{combat.checkedAt} 관통력·철거력 자료 확인</small>
              </section>
            )}
            <small>
              {checkedAt} 자료 확인 ·{' '}
              <a href={source} target="_blank" rel="noopener noreferrer">
                {item.group === 'armor' ? '효과 출처' : '한국어 자료'}
              </a>
              {details.additionalSource && (
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
