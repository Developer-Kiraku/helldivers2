'use client';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GripVertical } from 'lucide-react';
import { equipmentForId, equipmentMatchesSearch, selectableEquipment } from '@/lib/equipment.mjs';
import { moveTierItem, unrankedEquipment } from '@/lib/tier-list.mjs';
import useTierDrag from '@/hooks/useTierDrag';
import { EquipmentIcon } from './EquipmentIcon';
import { Input } from './ui';

export default function TierList({ value, onChange, disabled = false }) {
  const editable = Boolean(onChange);
  const boardRef = useRef(null);
  const [search, setSearch] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [poolOrder, setPoolOrder] = useState(() =>
    selectableEquipment(value.group).map((item) => item.id),
  );
  const unranked = new Set(unrankedEquipment(value).map((item) => item.id));
  const pool = poolOrder.filter((id) => unranked.has(id));
  function move(id, { row, before }) {
    if (disabled) return;
    if (row === null && before !== id)
      setPoolOrder((order) => {
        const next = order.filter((key) => key !== id);
        const index = before ? next.indexOf(before) : -1;
        next.splice(index < 0 ? next.length : index, 0, id);
        return next;
      });
    onChange(moveTierItem(value, id, row, before));
    setAnnouncement(
      `${equipmentForId(id)?.label}: ${row === null ? '대기' : value.rows[row].name}로 이동했습니다.`,
    );
  }
  const { drag, start } = useTierDrag({ boardRef, disabled: disabled || !editable, onDrop: move });
  const activeItem = drag ? equipmentForId(drag.id) : null;
  function keyboard(event, id, row) {
    if (disabled || drag) return;
    const items = row === null ? pool : value.rows[row].items;
    const index = items.indexOf(id);
    let target;
    if (event.key === 'ArrowLeft' && index > 0) target = { row, before: items[index - 1] };
    if (event.key === 'ArrowRight' && index < items.length - 1)
      target = { row, before: items[index + 2] || null };
    if (event.key === 'ArrowUp')
      target = { row: row === null ? value.rows.length - 1 : Math.max(0, row - 1) };
    if (event.key === 'ArrowDown')
      target = { row: row === null || row === value.rows.length - 1 ? null : row + 1 };
    if (event.key === 'Delete' || event.key === 'Backspace') target = { row: null };
    if (target) {
      event.preventDefault();
      move(id, target);
    }
  }
  function itemCard(id, row) {
    const item = equipmentForId(id);
    if (!item) return null;
    return (
      <div
        key={id}
        className={`tier-item ${drag?.id === id ? 'tier-drag-origin' : ''}`}
        data-tier-item={id}
        role={editable ? 'button' : undefined}
        tabIndex={editable && !disabled ? 0 : undefined}
        aria-label={editable ? `${item.label} 드래그하여 이동` : undefined}
        aria-disabled={editable ? disabled : undefined}
        onPointerDown={editable ? (event) => start(event, id) : undefined}
        onKeyDown={editable ? (event) => keyboard(event, id, row) : undefined}
        onDragStart={(event) => event.preventDefault()}
      >
        {editable && (
          <span className="tier-drag-handle" title="잡고 끌어서 이동">
            <GripVertical size={18} aria-hidden="true" />
          </span>
        )}
        <EquipmentIcon item={item} />
      </div>
    );
  }
  function cards(ids, row) {
    const target = drag?.target;
    const showPreview = activeItem && target?.row === row;
    const preview = () => (
      <div
        key="drop-preview"
        className="tier-item tier-drop-preview"
        data-tier-placeholder="true"
        aria-label={`${activeItem.label} 놓을 위치`}
      >
        <EquipmentIcon item={activeItem} />
      </div>
    );
    const result = ids.flatMap((id) => [
      showPreview && target.before === id ? preview() : null,
      itemCard(id, row),
    ]);
    if (showPreview && (!target.before || !ids.includes(target.before))) result.push(preview());
    return result;
  }
  return (
    <div
      ref={boardRef}
      className={`tier-board ${editable ? 'tier-editable' : ''} ${drag ? 'tier-dragging' : ''}`}
    >
      {editable && (
        <>
          <p className="field-hint">
            장비를 끌어 티어에 놓으세요. 모바일에서는 장비의 ⋮⋮ 손잡이를 잡고 이동하세요. Esc 또는
            영역 밖에 놓으면 취소됩니다.
          </p>
          <span className="sr-only">
            키보드: 장비에 초점을 맞추고 위아래 방향키로 티어 이동, 좌우로 순서 변경, Delete로 대기
            복귀.
          </span>
        </>
      )}
      <div className="tier-rows">
        {value.rows.map((row, index) => (
          <section
            className={`tier-row tier-color-${index} ${drag?.target?.row === index ? 'drop-active' : ''}`}
            key={index}
            aria-label={`${row.name} 티어`}
            data-tier-drop={index}
          >
            <div className="tier-label">
              {editable ? (
                <Input
                  aria-label={`${index + 1}번째 티어명`}
                  value={row.name}
                  maxLength={20}
                  disabled={disabled || Boolean(drag)}
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
              {cards(row.items, index)}
              {editable && !row.items.length && drag?.target?.row !== index && (
                <span className="tier-placeholder">여기에 배치</span>
              )}
            </div>
          </section>
        ))}
      </div>
      {editable && (
        <>
          <section
            className={`tier-pool ${drag?.target?.row === null ? 'drop-active' : ''}`}
            aria-label="대기 장비"
            data-tier-drop="pool"
          >
            <header>
              <h2>
                대기 <span>{pool.length}</span>
              </h2>
              <Input
                aria-label="대기 장비 검색"
                placeholder="장비 검색"
                value={search}
                disabled={Boolean(drag)}
                onChange={(event) => setSearch(event.target.value)}
              />
            </header>
            <div className="tier-items">
              {cards(
                pool.filter((id) => equipmentMatchesSearch(equipmentForId(id), search)),
                null,
              )}
              {!pool.length && drag?.target?.row !== null && (
                <span className="tier-placeholder">여기에 놓으면 대기로 돌아갑니다.</span>
              )}
              {pool.length > 0 &&
                !pool.some((id) => equipmentMatchesSearch(equipmentForId(id), search)) && (
                  <span className="tier-placeholder">검색 결과가 없습니다.</span>
                )}
            </div>
          </section>
          <span className="sr-only" role="status" aria-live="polite">
            {announcement}
          </span>
          {activeItem &&
            createPortal(
              <div
                className="tier-drag-overlay"
                aria-hidden="true"
                style={{ left: drag.x + 14, top: drag.y + 14 }}
              >
                <EquipmentIcon item={activeItem} />
              </div>,
              document.body,
            )}
        </>
      )}
    </div>
  );
}
