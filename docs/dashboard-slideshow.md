# 대시보드 배경 슬라이드 제작 기록

- 제작: 내장 image_gen 도구. 원래 배너를 스타일 참조, 게임 사진을 적 외형 참조로 제공한 새 이미지 생성.
- 첫 장: 기존 `public/images/community-squad.png` 원본을 수정 없이 복원.
- 추가 3장: 오토마톤 / 테르미닛 / 일루미닛. 대원들의 슈트·헬멧·색상과 행성 배경을 구분.
- 이전 설원·정글·격납고 이미지는 삭제.
- 적용 범위: 상단 배경만 0.45초 opacity 페이드. 로고·버튼·레이아웃 유지.
- 자동 전환: 6초. 백그라운드 탭 및 모션 줄이기에서는 자동 전환 중지. 로드 실패 장면 건너뛰기.
- 이미지/문구: `src/lib/dashboard-slides.mjs`, UI: `src/components/DashboardHero.jsx`.
- 새 배포 이미지: WebP 가로 1600px, 원본 비율 유지. 기존 PNG는 원본 유지.

## 게임 사진 참고

- [오토마톤 Devastator](https://helldiverstrainingmanual.com/images/bestiary/devastator.png)
- [테르미닛 Charger](https://media.esports.gg/uploads/2024/03/Charger-Terminid.jpg)
- [공식 Illuminate 소개 및 Overseer 사진](https://blog.playstation.com/2024/12/12/new-helldivers-2-update-omens-of-tyranny-live-now-features-the-return-of-the-illuminate-faction/)
- [Illuminate 외형 비교 사진](https://cdn.mos.cms.futurecdn.net/SnkpyRuMNDE9qMKudLznmG.jpg)

참고 사진 원본은 배포하지 않으며, 외형 참고로만 사용.

## 공통 생성 프롬프트

각 장면은 아래 공통 프롬프트 뒤에 개별 프롬프트를 결합해 생성.

```text
Create ONE new panoramic 3:1 landscape website hero illustration for a Helldivers 2 community. Image 1 is a STYLE reference only: retain its cute compact chibi armored characters, hand-painted cinematic game illustration, clean detailed shapes and humorous squad energy. Other attached references are ACTUAL GAME ENEMY DESIGN references: faithfully preserve their identifying silhouette, head/face shape, anatomy, armor panels, limb arrangement and signature equipment, translating them into chibi proportions rather than replacing them with generic fantasy monsters. Create a genuinely new action scene, not a reference sheet, collage or lineup. Human Helldivers remain fully enclosed-helmeted with dark visors and capes. EVERY Helldiver wears a clearly different plausible Helldivers armor suit, helmet and colors. Show the enemies large enough to recognize. Keep the left 30% calm, dark and low-detail for overlaid text; put the actual encounter and characters in the center-right/right. Keep important faces away from far edges. Cute tense comedy rather than gore, no text, lettering, logos, watermarks or UI.
```

## automaton-front

저장 경로: `public/images/dashboard/automaton-front.webp`

```text
AUTOMATON FRONT: a smoky rainy industrial planet with ruined metal factories, red beacon lights, ash and cold slate atmosphere. Four chibi Helldivers huddle behind a low broken steel barricade in the lower center-right, watching one chibi Automaton Devastator approach from the right. Match the attached Devastator: squat heavy biped, tiny skull-like square head with paired glowing RED EYES, boxy blue-gray chest, broad rust-red shoulder plates, visible piston joints, chunky mechanical boots and arm gun. Preserve unmistakable industrial Automaton design; do not give it a cute animal face or a smooth rounded astronaut helmet. A few skeletal red-eyed Trooper silhouettes and a dropship in background. Helldiver suits: black/yellow standard tactical armor, white/green medic with red markings, tan hooded lightweight scout, slate-blue reinforced heavy with large shoulder plates. Their comic braced poses convey camaraderie and action.
```

## terminid-front

저장 경로: `public/images/dashboard/terminid-front.webp`

```text
TERMINID FRONT: alien sulfur badlands with giant fungal towers, insect nest openings, spore clouds and greenish mist under a bright dusty sky. A chibi Charger from the actual game reference stomps in from middle-right while four chibi Helldivers react comically from a small rock ledge in the foreground. The Charger must retain its exact low massive quadruped beetle/rhinoceros body plan: overlapping rough stone-gray chitin plates, broad pointed armored head hiding a small dark mouth and mandibles, thick armored front legs, powerful rear legs, orange exposed flesh between carapace joints. NOT a dinosaur, cute rhinoceros mammal or generic spider. Small orange-brown Terminid Warriors with tall jagged dorsal chitin, insect mandibles and curved scythe forelegs emerge nearby; do not turn them into plush animals. Diver suits are distinctly different: white/red medic, olive-green hooded scout, dark charcoal/yellow heavy armor, dusty orange demolition suit with pouch belt; all black-visored sealed helmets and capes. Cute recognizable game monsters and adventurous comedy.
```

## illuminate-front

저장 경로: `public/images/dashboard/illuminate-front.webp`

```text
ILLUMINATE FRONT: a ruined Super Earth colony plaza at blue-violet night, pale civic buildings, glowing alien energy, a hovering saucer, scattered street lamps. Four differently suited chibi Helldivers are braced around a broken civic fountain in the lower middle-right, confronting a chibi Illuminate Overseer on the right. Closely follow the supplied Overseer footage and full lineup: pale gray-lavender segmented organic armor, strong broad asymmetric flared shoulder plates, a tapered elongated angular dark squid-like helmet with vertical cyan luminous facial slits, dark neck tissue, and a long blue-energy-tipped Lightspear staff. Do NOT replace the Overseer with a human astronaut, blue-skinned elf, wizard or octopus with cartoon tentacles. Behind it, a recognizable Harvester stands on EXACTLY THREE extremely long jointed narrow pointed legs, a compact angular insect-like overhead body, bright cyan central eye and horn-like top prongs, optional faint cyan energy shield. Use the lineup for its silhouette, NOT a four-legged spider tank. Diver armor: white/teal medic, black/yellow command armor, sand-brown scout with a short hood and narrow visor, muted violet-gray heavy armor with broad plated shoulders. Comic determination, cute proportions but faithful enemy shapes.
```

