import catalog from './equipment-catalog.mjs';

// Checked 2026-11-05 against in-game command listings:
// https://divershub.app/database/stratagems
// https://helldivers.wiki.gg/wiki/Stratagems
const codes = {
  'orbital-precision-strike': 'RRU',
  'orbital-airburst-strike': 'RRR',
  'eagle-strafing-run': 'URR',
  'eagle-airstrike': 'URDR',
  'orbital-gas-strike': 'RRDR',
  'orbital-ems-strike': 'RRLD',
  'eagle-500kg-bomb': 'URDDD',
  'eagle-cluster-bomb': 'URDDR',
  'orbital-laser': 'RDURD',
  'orbital-railcannon-strike': 'RUDDR',
  'mg-43-machine-gun': 'DLDUR',
  'apw-1-anti-materiel-rifle': 'DLRUD',
  'eat-17-expendable-anti-tank': 'DDLUR',
  'gr-8-recoilless-rifle': 'DLRRL',
  'ac-8-autocannon': 'DLDUUR',
  'b-1-supply-pack': 'DLDUUD',
  'orbital-120mm-he-barrage': 'RRDLRD',
  'orbital-380mm-he-barrage': 'RDUULDD',
  'orbital-walking-barrage': 'RDRDRD',
};
export const stratagemCommands = Object.entries(codes).map(([name, code]) => {
  const item = catalog.find((item) => item.id === 'stratagem-' + name);
  if (!item) throw Error('Missing stratagem icon: ' + name);
  return { id: item.id, label: item.label, src: item.src, code };
});
