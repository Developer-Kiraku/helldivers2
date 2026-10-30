'use client';
import { Fragment, useState } from 'react';
import { Crosshair } from 'lucide-react';
import {
  selectableEquipment,
  equipmentGroups,
  equipmentMatchesSearch,
  stratagemKinds,
} from '@/lib/equipment.mjs';
import { Button, Input } from './ui';
import Modal from './Modal';

import { EquipmentIcon } from './EquipmentIcon';
export { EquipmentIcon } from './EquipmentIcon';

export function EquipmentPicker({
  onSelect,
  onOpen,
  disabled = false,
  fixedGroup,
  label = '장비 아이콘',
  excludeIds = [],
}) {
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState('primary');
  const [search, setSearch] = useState('');
  const matches = selectableEquipment(fixedGroup || group).filter(
    (item) => !excludeIds.includes(item.id) && equipmentMatchesSearch(item, search),
  );
  return (
    <>
      <Button
        type="button"
        className="emoticon-trigger"
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          onOpen?.();
          setOpen(true);
        }}
      >
        <Crosshair size={17} />
        {label}
      </Button>
      {open && (
        <Modal title={label} className="equipment-modal" onClose={() => setOpen(false)}>
          {!fixedGroup && (
            <div className="category-tabs" aria-label="장비 분류">
              {equipmentGroups.map(([id, label]) => (
                <Button
                  key={id}
                  type="button"
                  className={group === id ? 'selected' : ''}
                  aria-pressed={group === id}
                  onClick={() => setGroup(id)}
                >
                  {label}
                </Button>
              ))}
            </div>
          )}
          <Input
            aria-label="장비 이름 검색"
            placeholder="장비·채권 이름 검색 (한국어 / English)"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="equipment-results" aria-live="polite">
            {matches.length}개
          </div>
          <div
            className={`equipment-grid${(fixedGroup || group) === 'armor' ? ' armor-option-grid' : ''}${(fixedGroup || group) === 'warbond' ? ' warbond-grid' : ''}`}
          >
            {matches.map((item, index) => (
              <Fragment key={item.id}>
                {item.group === 'stratagem' && item.kind !== matches[index - 1]?.kind && (
                  <h2 className="equipment-kind-heading">
                    {stratagemKinds.find(([id]) => id === item.kind)?.[1]}
                  </h2>
                )}
                <div className="equipment-choice">
                  <Button
                    type="button"
                    aria-label={item.label}
                    aria-describedby={
                      item.group === 'armor' ? `armor-effect-${item.id}` : undefined
                    }
                    title={item.name}
                    onClick={() => {
                      onSelect(item);
                      setOpen(false);
                    }}
                  >
                    <EquipmentIcon item={item} />
                    {item.group === 'armor' && (
                      <span className="armor-option-description" id={`armor-effect-${item.id}`}>
                        {item.description || '효과 설명을 준비 중입니다.'}
                      </span>
                    )}
                  </Button>
                </div>
              </Fragment>
            ))}
          </div>
          {!matches.length && <p>검색 결과가 없습니다.</p>}
        </Modal>
      )}
    </>
  );
}
