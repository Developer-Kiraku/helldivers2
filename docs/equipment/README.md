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

방어구는 외형 대신 패시브 옵션 단위로 분류합니다. 스트라타젬은 임무용 호출도 포함합니다. ID는 저장된 글과 댓글의 참조이므로 이후 목록 갱신 시 유지해야 합니다. 기존 LAS-16 Trident 표기는 최신 Wiki의 LAS-13 Trident로, M-102 Fast Recon Vehicle은 M-102 Gunner FRV로 통합했습니다.

갱신 시 `src/lib/equipment-catalog.mjs`, 이 출처 기록, 실제 파일을 함께 업데이트하고 `node scripts/test-equipment.mjs` 및 전체 기능 검증을 실행합니다.
