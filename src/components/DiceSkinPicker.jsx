'use client';
import { useState } from 'react';
import { Check, Palette } from 'lucide-react';
import { useDiceGame } from './DiceGameProvider';
import { useCommunity } from './CommunityProvider';
import { diceSkin, diceSkins } from '@/lib/dice-skins.mjs';
import Dice3D from './Dice3D';
import Modal from './Modal';
import { Button } from './ui';

export default function DiceSkinPicker() {
  const [open, setOpen] = useState(false);
  const { data, act, busy, error } = useDiceGame() || {};
  const { role, actualRole } = useCommunity();
  const current = diceSkin(data?.skin);
  return (
    <>
      <Button
        type="button"
        className="dice-skin-trigger"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <Palette size={17} /> 주사위 스킨 <strong>{current.label}</strong>
      </Button>
      {open && (
        <Modal
          title="주사위 스킨"
          className="dice-skin-modal"
          onClose={() => setOpen(false)}
          footer={
            <Button type="button" onClick={() => setOpen(false)}>
              닫기
            </Button>
          }
        >
          <p className="dice-skin-hint">원하는 디자인을 선택하면 바로 적용됩니다.</p>
          <div className="dice-skin-options" aria-label="주사위 스킨 선택">
            {diceSkins.map((skin) => (
              <button
                type="button"
                key={skin.id}
                className="dice-skin-option"
                aria-pressed={current.id === skin.id}
                aria-label={`${skin.label} 스킨`}
                disabled={!data || busy || role !== actualRole}
                onClick={() => current.id !== skin.id && act('skin', { skin: skin.id })}
              >
                <span className="dice-skin-code">{skin.code}</span>
                {current.id === skin.id && (
                  <Check className="dice-skin-check" size={19} aria-hidden="true" />
                )}
                <span className="dice-skin-preview" aria-hidden="true">
                  <Dice3D value={5} skin={skin.id} rollKey="skin-preview" />
                </span>
                <strong>{skin.label}</strong>
                <small>{skin.description}</small>
              </button>
            ))}
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <p className="dice-skin-status" role="status" aria-live="polite">
            {busy ? '스킨을 저장하고 있습니다…' : `사용 중 · ${current.label}`}
          </p>
        </Modal>
      )}
    </>
  );
}
