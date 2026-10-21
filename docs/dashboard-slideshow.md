# 대시보드 배경 슬라이드 제작 기록

- 제작: 내장 image_gen 도구, 새 이미지 생성(참조 이미지 없이 제작)
- 적용 범위: 대시보드 상단 배경만 0.45초 opacity 페이드. 로고·버튼·레이아웃은 고정.
- 자동 전환: 6초. 백그라운드 탭 및 모션 줄이기 설정에서는 자동 전환을 쉬며, 이미지 로드 실패 시 해당 장면을 건너뜁니다.
- 문구: `src/lib/dashboard-slides.mjs`, UI: `src/components/DashboardHero.jsx`
- 시간: `dashboardSlideInterval = 6000`, 페이드 토큰: `duration.450`
- 납품 이미지: WebP, 가로 1600px, 원본 비율 유지.

## frozen-outpost

저장 경로: `public/images/dashboard/frozen-outpost.webp`

생성 프롬프트:

```text
Use case: stylized-concept. Create ONE wide 3:1 panoramic website hero background illustration for a Helldivers 2 adult gaming community. A distinctly icy polar world at night with towering BLUE ICE CLIFFS, drifting snow and a bright turquoise AURORA in a dark cobalt sky. Four small chibi futuristic Helldiver soldiers on a snowy outpost walkway, with cold blue lamps and a tiny orange heater. Each soldier has a DIFFERENT suit: white-and-red medic with rounded helmet, olive-green scout with slim visor and hooded cape, charcoal-and-yellow heavy with broad shoulder plates, burnt-orange engineer with tool pouches. Visually dominant environment is snow and ice, NO desert, NO golden sunset, NO rocky orange battlefield. Polished hand-painted game concept illustration with adorable compact chibi armored proportions, charming camaraderie, detailed enclosed futuristic helmets and capes, cinematic atmospheric depth, cohesive professional art direction. Clearly different silhouettes, colors, helmets, accessories and armor shapes for every member of the squad; do not dress everybody alike. Put the squad and major focal objects in the center-right and right third, leave the left third quieter and darker for webpage text. Wide landscape establishing shot, NOT a closeup lineup. No words, typography, logos, numbers, signatures, UI or watermark. One coherent scene, not a collage.
```

## alien-jungle

저장 경로: `public/images/dashboard/alien-jungle.webp`

생성 프롬프트:

```text
Use case: stylized-concept. Create ONE wide 3:1 panoramic website hero background illustration for a Helldivers 2 adult gaming community. A distinctly lush alien JUNGLE during bright soft daytime, colossal emerald leaves, luminous purple-blue flowers, hanging vines and a winding river with waterfall. Four chibi futuristic Helldiver soldiers take a cheerful break on a moss-covered stone bridge. Each has a DIFFERENT suit: cobalt-blue recon with narrow visor, white-and-red medic with rounded helmet, sand-beige armored gunner with bulky plates, forest-green ranger with long cape. Environment is overwhelmingly green vegetation, purple flowers and cascading water, NO desert, NO golden sunset, NO snowy mountains. Polished hand-painted game concept illustration with adorable compact chibi armored proportions, charming camaraderie, detailed enclosed futuristic helmets and capes, cinematic atmospheric depth, cohesive professional art direction. Clearly different silhouettes, colors, helmets, accessories and armor shapes for every member of the squad; do not dress everybody alike. Put the squad and major focal objects in the center-right and right third, leave the left third quieter and darker for webpage text. Wide landscape establishing shot, NOT a closeup lineup. No words, typography, logos, numbers, signatures, UI or watermark. One coherent scene, not a collage.
```

## orbital-hangar

저장 경로: `public/images/dashboard/orbital-hangar.webp`

생성 프롬프트:

```text
Use case: stylized-concept. Create ONE wide 3:1 panoramic website hero background illustration for a Helldivers 2 adult gaming community. Inside an immense futuristic ORBITAL SPACECRAFT HANGAR, open blast doors reveal a star-filled purple-black space and a large blue planet. Steel catwalks, overhead cool white strip lights, a docked angular dropship, a supply terminal. Four chibi Helldiver soldiers celebrate a completed mission on the right side. Each has a DIFFERENT suit: black-and-yellow command armor and cape, white-and-teal combat medic, orange heavy engineer with oversized shoulder plates, muted purple-gray stealth scout with slim helmet. Entirely an industrial SPACE STATION INTERIOR, NO outdoor terrain, NO desert, NO sunset. Polished hand-painted game concept illustration with adorable compact chibi armored proportions, charming camaraderie, detailed enclosed futuristic helmets and capes, cinematic atmospheric depth, cohesive professional art direction. Clearly different silhouettes, colors, helmets, accessories and armor shapes for every member of the squad; do not dress everybody alike. Put the squad and major focal objects in the center-right and right third, leave the left third quieter and darker for webpage text. Wide landscape establishing shot, NOT a closeup lineup. No words, typography, logos, numbers, signatures, UI or watermark. One coherent scene, not a collage.
```
