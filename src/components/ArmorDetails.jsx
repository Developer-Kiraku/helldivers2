'use client';
import { equipmentForId } from '@/lib/equipment.mjs';
import EquipmentDetails from './EquipmentDetails';

export default function ArmorDetails(props) {
  if (equipmentForId(props.id)?.group !== 'armor') return null;
  return <EquipmentDetails {...props} />;
}
