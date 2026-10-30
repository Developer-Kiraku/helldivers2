'use client';
import { useRef, useState } from 'react';
import { equipmentForId, equipmentMatchesSearch } from '@/lib/equipment.mjs';
import { moveTierItem, unrankedEquipment } from '@/lib/tier-list.mjs';
import { EquipmentIcon } from './EquipmentIcon';
import { Button, Input, Select } from './ui';
import Icon from './Icon';

export default function TierList({ value, onChange, disabled = false }) {
  const editable = Boolean(onChange);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [over, setOver] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  const dragging = useRef(null);
  const pool = unrankedEquipment(value);
  const selectedItem = equipmentForId(selected);
  const rowIndex = value.rows.findIndex((row) => row.items.includes(selected));
  const itemIndex = rowIndex < 0 ? -1 : value.rows[rowIndex].items.indexOf(selected);
  function move(id, row, before = null) {
    if (disabled) return;
    onChange(moveTierItem(value, id, row, before));
    setAnnouncement(
      `${equipmentForId(id)?.label}: ${row === null ? '대기' : value.rows[row].name}로 이동했습니다.`,
    );
  }
  function drop(event, row, before = null) {
    event.preventDefault();
    event.stopPropagation();
    if (dragging.current) move(dragging.current, row, before);
    dragging.current = null;
    setOver(null);
  }
  function itemCard(id, row) {
    const item = equipmentForId(id);
    if (!item) return null;
    return editable ? (
      <Button
        type="button"
        key={id}
        className={`tier-item ${selected === id ? 'selected' : ''} ${over === id ? 'drop-before' : ''}`}
        aria-label={`${item.label} 선택`}
        aria-pressed={selected === id}
        disabled={disabled}
        draggable={!disabled}
        onDragStart={(event) => {
          dragging.current = id;
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', id);
        }}
        onDragEnd={() => {
          dragging.current = null;
          setOver(null);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOver(id);
        }}
        onDrop={(event) => drop(event, row, id)}
        onClick={() => setSelected(selected === id ? null : id)}
      >
        <EquipmentIcon item={item} />
      </Button>
    ) : (
      <div className="tier-item" key={id}>
        <EquipmentIcon item={item} />
      </div>
    );
  }
  return (
    <div className={`tier-board ${editable ? 'tier-editable' : ''}`}>
      {editable && (
        <p className="field-hint">
          드래그로 배치하거나, 장비를 눌러 이동·순서를 조정하세요. 티어명도 직접 바꿀 수 있습니다.
        </p>
      )}
      <div className="tier-rows">
        {value.rows.map((row, index) => (
          <section
            className={`tier-row tier-color-${index} ${over === index ? 'drop-active' : ''}`}
            key={index}
            aria-label={`${row.name} 티어`}
            onDragOver={
              editable
                ? (event) => {
                    event.preventDefault();
                    setOver(index);
                  }
                : undefined
            }
            onDrop={editable ? (event) => drop(event, index) : undefined}
          >
            <div className="tier-label">
              {editable ? (
                <Input
                  aria-label={`${index + 1}번째 티어명`}
                  value={row.name}
                  maxLength={20}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange({
                      ...value,
                      rows: value.rows.map((entry, i) =>
                        i === index ? { ...entry, name: event.target.value } : entry,
                      ),
                    })
                  }
                />
              ) : (
                <strong>{row.name}</strong>
              )}
              <small>{row.items.length}</small>
            </div>
            <div className="tier-items">
              {row.items.map((id) => itemCard(id, index))}
              {editable && !row.items.length && (
                <span className="tier-placeholder">여기에 배치</span>
              )}
            </div>
          </section>
        ))}
      </div>
      {editable && (
        <>
          <section
            className={`tier-pool ${over === 'pool' ? 'drop-active' : ''}`}
            aria-label="대기 장비"
            onDragOver={(event) => {
              event.preventDefault();
              setOver('pool');
            }}
            onDrop={(event) => drop(event, null)}
          >
            <header>
              <h2>
                대기 <span>{pool.length}</span>
              </h2>
              <Input
                aria-label="대기 장비 검색"
                placeholder="장비 검색"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </header>
            <div className="tier-items">
              {pool
                .filter((item) => equipmentMatchesSearch(item, search))
                .map((item) => itemCard(item.id, null))}
              {!pool.length && (
                <span className="tier-placeholder">
                  모든 장비를 배치했습니다. 여기에 놓으면 대기로 돌아갑니다.
                </span>
              )}
              {pool.length > 0 && !pool.some((item) => equipmentMatchesSearch(item, search)) && (
                <span className="tier-placeholder">검색 결과가 없습니다.</span>
              )}
            </div>
          </section>
          {selectedItem && (
            <div className="tier-move-bar" aria-label="선택 장비 이동">
              <strong>{selectedItem.label}</strong>
              <Select
                aria-label="이동할 티어"
                value={rowIndex < 0 ? 'pool' : String(rowIndex)}
                disabled={disabled}
                onChange={(event) =>
                  move(selected, event.target.value === 'pool' ? null : Number(event.target.value))
                }
              >
                <option value="pool">대기</option>
                {value.rows.map((row, i) => (
                  <option key={i} value={String(i)}>
                    {row.name || `${i + 1}번째 티어`}
                  </option>
                ))}
              </Select>
              <Button
                type="button"
                aria-label="앞으로 이동"
                disabled={disabled || itemIndex <= 0}
                onClick={() => move(selected, rowIndex, value.rows[rowIndex].items[itemIndex - 1])}
              >
                <Icon name="back" size={16} />
              </Button>
              <Button
                type="button"
                aria-label="뒤로 이동"
                disabled={
                  disabled || rowIndex < 0 || itemIndex === value.rows[rowIndex].items.length - 1
                }
                onClick={() =>
                  move(selected, rowIndex, value.rows[rowIndex].items[itemIndex + 2] || null)
                }
              >
                <Icon name="arrow" size={16} />
              </Button>
              <Button type="button" aria-label="장비 선택 해제" onClick={() => setSelected(null)}>
                <Icon name="close" size={16} />
              </Button>
            </div>
          )}
          <span className="sr-only" role="status" aria-live="polite">
            {announcement}
          </span>
        </>
      )}
    </div>
  );
}
