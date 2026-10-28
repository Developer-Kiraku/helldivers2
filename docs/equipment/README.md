# 장비 아이콘 자료

확인일: 2026-10-28. 게임 장비 이미지와 UI 아이콘을 WebP(240×160, 투명 배경)로 변환하여 `public/equipment/`에서 직접 제공합니다. AI 생성 이미지는 사용하지 않았습니다. 원본 자산의 권리는 Arrowhead Game Studios / Sony Interactive Entertainment 및 해당 권리자에게 있습니다. 이 저장소의 코드 라이선스가 게임 자산에 적용되는 것은 아닙니다.

`sources.json`은 각 항목의 원본 이미지 URL, 장비 페이지, 영문명, 표시명과 로컬 파일 경로를 기록합니다. 기본 한국어 명칭은 DiversHub 한국어 데이터베이스를 참고했으며, 한국어 자료가 없는 최신 항목은 영문 원명을 함께 보존하고 한국어 표기를 제공합니다. 영문명으로도 검색할 수 있습니다.

- https://divershub.app/ko/database/weapons
- https://divershub.app/ko/database/stratagems
- https://divershub.app/ko/database/armor
- https://helldivers.wiki.gg/wiki/Weapons
- https://helldivers.wiki.gg/wiki/Stratagems
- https://helldivers.wiki.gg/wiki/Boosters
- https://helldivers.wiki.gg/wiki/Armor_Passives
- https://blog.playstation.com/2026/10/13/helldivers-2-scope-of-authority-premium-warbond-launches-oct-20/
- https://blog.playstation.com/2026/10/26/celebrate-helldivers-2-liberty-day-2026-with-in-game-gifts-today/

방어구는 외형 대신 패시브 옵션 단위로 분류합니다. 스트라타젬은 Offensive/Supply/Defensive Permit의 편성 가능한 95개만 선택창에 표시합니다. Other에 속한 임무·기본 호출 22개는 `selectable: false`로 제외합니다. 기존 글·댓글이 깨지지 않도록 해당 ID와 자산은 보존합니다. ID는 저장된 글과 댓글의 참조이므로 이후 목록 갱신 시 유지해야 합니다. 기존 LAS-16 Trident 표기는 최신 Wiki의 LAS-13 Trident로, M-102 Fast Recon Vehicle은 M-102 Gunner FRV로 통합했습니다.

2026-10-28 재점검: 전체 장비명과 해당 Wiki 이미지 연결을 대조하고, 선택 가능한 254개를 시각 검토했습니다. 기존 파일명에 CQC-72 지원 도구가 연결된 CQC-73, 아이콘/렌더가 혼용된 스토커·비토·기가 수류탄 등을 포함해 64개 파일을 해당 장비의 원본 렌더/아이콘으로 갱신했습니다. 캘트롭스는 같은 240×160 캔버스 안에서 그림을 65%로 줄여 이름과 카드 크기에 영향을 주지 않도록 했습니다. 재점검 참조는 `checkedAgainst`/`checkedImage`, 실제 교체 파일의 이전 원본은 `previousImage`에 기록합니다. 원본 출처가 같은 파일도 렌더 해상도 차이로 갱신될 수 있으며, 갱신 개수가 잘못된 장비 이미지의 개수를 의미하지 않습니다.

멜타 지뢰의 손잡이가 달린 원형 외형은 Sony 작성자의 [Xbox Wire 공식 소개 이미지](https://news.xbox.com/en-us/2026/08/07/helldivers-2-x-warhammer-40000-warbond-xbox/)와 대조했습니다. AI로 형태를 재생성하지 않고 고해상도 게임 렌더를 사용합니다.

갱신 시 `src/lib/equipment-catalog.mjs`, 이 출처 기록, 실제 파일을 함께 업데이트하고 `node scripts/test-equipment.mjs` 및 전체 기능 검증을 실행합니다.

## 공통 목록 관리

### 2026-10-29 한국어 명칭 및 종류 정렬

한국어 장비 문서의 명칭·영문 대응과 공식 한국어 소개를 비교하여 선택 가능한 254개 중 253개의 한국어 표기를 대조하고 143개 표시명을 수정했습니다. 이전 표기는 `searchAliases`에 보존했습니다. 단순 자동 번역 자료를 한국어판 명칭의 확정 근거로 사용하지 않습니다. 각 항목의 대조 페이지는 `sources.json`의 `koreanNameSource`에 기록합니다.

- 주무기·보조·투척: https://www.namu.moe/w/HELLDIVERS%202/무기/주%20무기 및 같은 문서의 보조/투척 무기 페이지
- 스트라타젬: https://www.namu.moe/w/HELLDIVERS%202/스트라타젬/보급 및 공격/방어 페이지
- 방어구: https://www.namu.moe/w/HELLDIVERS%202/방어구
- 부스터: https://www.namu.moe/w/HELLDIVERS%202/부스터
- 공식 소개 대조: https://blog.ko.playstation.com/2026/01/21/20260121-helldivers2/ 및 https://blog.ko.playstation.com/?p=32332

확인 제한: `armor-kinetic-displacement-mitigation`의 한국어판 명칭은 확인하지 못해 기존 표시명 ‘운동량 전이 완화’를 유지합니다. CQC-73과 AX/ARC-3는 한국어 문서와 장비 번호가 달라 원본 장비 ID/번호를 유지하고 한글 명칭 부분만 반영했습니다. 방어구 옵션 3종의 ‘충격 방지 패드 · 위험물/척탄병/강화’는 같은 이름의 효과를 구분하기 위한 부가 표기입니다.

스트라타젬의 `kind`는 공통 카탈로그에서 관리하며 지원 무기 → 배낭 → 이글 → 궤도 → 방어 시설 → 탑승 장비 순, 같은 종류에서는 이름순으로 정렬합니다. 글·댓글·로드아웃 선택창에 같은 순서와 구분 제목을 적용하며, 저장된 로드아웃의 사용자가 지정한 슬롯 순서는 변경하지 않습니다.

2026-10-29: [공식 한국어 소개](https://blog.ko.playstation.com/?p=32332)와 권위의 가늠자(Scope of Authority)의 기존 6개 항목을 대조했습니다. R-40 사이트라이너, P-44 미스트, G-11 마름쇠, AMW-20 에이펙스, LAS-44 노바, 정적인 장막이 모두 포함되어 있습니다. 투척무기와 방어구 옵션은 공식 한국어 표기로 정리하고 이전 이름도 검색 별칭으로 유지했습니다. 채권명과 사용자 표현인 ‘권한의 범위’로 각 분류에서 검색할 수 있습니다. 기존 ID, 실제 게임 이미지, 마름쇠의 축소 비율, 미션용 스트라타젬 제외 설정은 유지합니다. 전체 276개 이미지 파일의 형식·크기·참조를 검사했습니다.

장비 이름·아이콘 경로·분류·선택 가능 여부는 src/lib/equipment-catalog.mjs 한 곳에서 관리합니다. 글/댓글과 로드아웃 선택창은 src/lib/equipment.mjs의 selectableEquipment를 공통으로 사용합니다. 로드아웃에는 장비 ID만 저장하며 표시명과 이미지는 같은 목록에서 조회합니다. 미션용 스트라타젬은 selectable: false로 유지합니다. 갑옷 종류와 종족/슬롯 규칙은 src/lib/loadout.mjs에서 관리합니다. 별도 관리 페이지는 없습니다.
