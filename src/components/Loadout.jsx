'use client';
import { EquipmentIcon, EquipmentPicker } from './Equipment';
import { equipmentForId } from '@/lib/equipment.mjs';
import { armorClasses, loadoutSlots } from '@/lib/loadout.mjs';
import { Label, Select } from './ui';
import ArmorDetails from './ArmorDetails';

export function LoadoutDisplay({ value, compact = false }) {
  if (!value) return null;
  const slots = [
    ...loadoutSlots.slice(0, 3).map(([key, label]) => [label, value[key]]),
    [`${value.armorClass} · 방어구 옵션`, value.armor],
    ...value.stratagems.map((id, i) => [`스트라타젬 ${i + 1}`, id]),
  ];
  return (
    <section
      className={`loadout-display loadout-summary${compact ? ' loadout-compact' : ''}`}
      aria-label="장비 세팅"
    >
      {slots.map(([label, id]) => (
        <div
          className="loadout-slot"
          key={label}
          title={`${label}: ${equipmentForId(id)?.label || ''}`}
        >
          {!compact && <strong>{label}</strong>}
          {equipmentForId(id) && <EquipmentIcon item={equipmentForId(id)} />}
          {!compact && id === value.armor && <ArmorDetails id={id} />}
        </div>
      ))}
    </section>
  );
}
export function LoadoutFields({ value, onChange, disabled }) {
  const slot = (group, label, id, select, excluded = []) => (
    <div className="loadout-slot" key={label}>
      <strong>{label}</strong>
      {equipmentForId(id) ? (
        <EquipmentIcon item={equipmentForId(id)} />
      ) : (
        <span className="loadout-empty">선택 전</span>
      )}
      <EquipmentPicker
        fixedGroup={group}
        label={label}
        disabled={disabled}
        excludeIds={excluded}
        onSelect={(item) => select(item.id)}
      />
      {group === 'armor' && (
        <>
          <Label htmlFor="armor-class">갑옷 종류</Label>
          <Select
            id="armor-class"
            value={value.armorClass}
            onChange={(event) => onChange({ ...value, armorClass: event.target.value })}
          >
            {armorClasses.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </Select>
          <ArmorDetails id={id} disabled={disabled} />
        </>
      )}
    </div>
  );
  return (
    <fieldset className="loadout-fields" disabled={disabled}>
      <legend>장비 세팅</legend>
      <div className="loadout-display">
        {loadoutSlots.map(([key, label]) =>
          slot(key, label, value[key], (id) => onChange({ ...value, [key]: id })),
        )}
      </div>
      <div className="loadout-display">
        {value.stratagems.map((id, index) =>
          slot(
            'stratagem',
            `스트라타젬 ${index + 1}`,
            id,
            (next) =>
              onChange({
                ...value,
                stratagems: value.stratagems.map((old, i) => (i === index ? next : old)),
              }),
            value.stratagems.filter((_, i) => i !== index),
          ),
        )}
      </div>
    </fieldset>
  );
}
