export function EquipmentIcon({ item }) {
  return (
    <span className="equipment-inline" data-equipment={item.id}>
      <img
        src={item.src}
        alt=""
        loading="lazy"
        width={item.group === 'warbond' ? 640 : 240}
        height={item.group === 'warbond' ? 320 : 160}
      />
      <span>{item.label}</span>
    </span>
  );
}
