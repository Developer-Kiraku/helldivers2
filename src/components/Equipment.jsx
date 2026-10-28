'use client';
import { useState } from 'react';
import { Crosshair } from 'lucide-react';
import { equipment, equipmentGroups } from '@/lib/equipment.mjs';
import { Button, Input } from './ui';
import Modal from './Modal';

export function EquipmentIcon({ item }) {
  return (
    <span className="equipment-inline" data-equipment={item.id}>
      <img src={item.src} alt="" loading="lazy" width="240" height="160" />
      <span>{item.label}</span>
    </span>
  );
}
export function EquipmentPicker({ onSelect, onOpen, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState('primary');
  const [search, setSearch] = useState('');
  const query = search.trim().toLocaleLowerCase();
  const matches = equipment.filter(
    (item) =>
      item.group === group && `${item.label} ${item.name}`.toLocaleLowerCase().includes(query),
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
        장비 아이콘
      </Button>
      {open && (
        <Modal title="장비 아이콘" className="equipment-modal" onClose={() => setOpen(false)}>
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
          <Input
            aria-label="장비 이름 검색"
            placeholder="장비 이름 검색 (한국어 / English)"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="equipment-results" aria-live="polite">
            {matches.length}개
          </div>
          <div className="equipment-grid">
            {matches.map((item) => (
              <Button
                key={item.id}
                type="button"
                aria-label={item.label}
                title={item.name}
                onClick={() => {
                  onSelect(item);
                  setOpen(false);
                }}
              >
                <EquipmentIcon item={item} />
              </Button>
            ))}
          </div>
          {!matches.length && <p>검색 결과가 없습니다.</p>}
        </Modal>
      )}
    </>
  );
}
