import { equipmentGroups } from '@/lib/equipment.mjs';

export default function TierListMeta({ value, draft = false }) {
  return (
    <div className="tier-meta" aria-label="티어리스트 분류">
      <span className="tier-meta-chip">
        <span className="tier-meta-label">분류</span>
        {equipmentGroups.find(([key]) => key === value.group)?.[1]}
      </span>
      <span className="tier-meta-chip">
        <span className="tier-meta-label">종족</span>
        {value.faction}
      </span>
      {draft && <span className="tier-meta-chip tier-meta-draft">임시저장 · 나만 보기</span>}
    </div>
  );
}
