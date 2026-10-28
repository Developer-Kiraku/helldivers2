export function EquipmentIcon({ item }) {
  return (
    <span className="equipment-inline" data-equipment={item.id}>
      <img src={item.src} alt="" loading="lazy" width="240" height="160" />
      <span>{item.label}</span>
    </span>
  );
}
