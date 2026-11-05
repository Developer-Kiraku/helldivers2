// Shared equipment effects and stats. Provenance: docs/equipment/{sources,detail-sources}.json
export default {
  'primary-sg-8-punisher': {
    stats: [
      ['대미지', '486'],
      ['용량', '16'],
      ['반동', '120'],
      ['연사율', '80 RPM'],
    ],
    traits: ['경장갑 관통', '탄약 재장전'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '2',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'throwable-g-6-frag': {
    stats: [
      ['대미지', '500'],
      ['관통', '3'],
      ['반경', '10 m'],
      ['신관 지연 시간', '2.4초'],
    ],
    traits: ['일반 장갑 관통', '폭발성'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%ED%88%AC%EC%B2%99%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    summary: '폭발과 함께 파편을 흩뿌리는 수류탄입니다.',
    combat: {
      profiles: [
        {
          label: '폭발',
          penetration: '중심 3 · 외곽 2 · 충격파 3',
          demolition: '20',
        },
        {
          label: '파편',
          penetration: '3',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'primary-r-63-diligence': {
    stats: [
      ['대미지', '165'],
      ['용량', '25'],
      ['반동', '35'],
      ['연사율', '350 RPM'],
    ],
    traits: ['경장갑 관통'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '2',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'secondary-p-19-redeemer': {
    stats: [
      ['대미지', '70'],
      ['용량', '31'],
      ['반동', '15'],
      ['연사율', '1100 RPM'],
    ],
    traits: ['경장갑 관통', '한 손 파지'],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EB%B3%B4%EC%A1%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '2',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'booster-hellpod-space-optimization': {
    stats: [],
    traits: [],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%B6%80%EC%8A%A4%ED%84%B0',
    checkedAt: '2026-11-01',
    summary: '강하 시 탄약·수류탄·각성제를 최대 보유량으로 지급합니다.',
  },
  'primary-smg-37-defender': {
    stats: [
      ['대미지', '110'],
      ['용량', '45'],
      ['반동', '10'],
      ['연사율', '520 RPM'],
    ],
    traits: ['경장갑 관통', '한 손 파지'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '2',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'booster-vitality-enhancement': {
    stats: [],
    traits: [],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%B6%80%EC%8A%A4%ED%84%B0',
    checkedAt: '2026-11-01',
    summary: '분대원이 받는 피해를 줄입니다.',
  },
  'primary-sg-225-breaker': {
    stats: [
      ['대미지', '330'],
      ['용량', '16'],
      ['반동', '55'],
      ['연사율', '300 RPM'],
    ],
    traits: ['경장갑 관통'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '2',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'primary-las-5-scythe': {
    stats: [
      ['초당 대미지', '350'],
      ['사격 제한', '8초'],
      ['반동', '0'],
    ],
    traits: ['경장갑 관통', '광선', '과열'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    summary: '연속 광선을 발사합니다. 과열 전에 식히면 방열판 교체 없이 계속 사용할 수 있습니다.',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '2',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'throwable-g-16-impact': {
    stats: [
      ['대미지', '400'],
      ['관통', '4'],
      ['반경', '7 m'],
      ['신관 지연 시간', '충격'],
    ],
    traits: ['중장갑 관통', '폭발성'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%ED%88%AC%EC%B2%99%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    summary: '표면에 부딪히면 즉시 폭발합니다.',
    combat: {
      profiles: [
        {
          label: '폭발',
          penetration: '중심 4 · 외곽 3 · 충격파 4',
          demolition: '30',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'booster-uav-recon-booster': {
    stats: [],
    traits: [],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%B6%80%EC%8A%A4%ED%84%B0',
    checkedAt: '2026-11-01',
    summary: '분대의 레이더 탐지 범위를 넓힙니다.',
  },
  'primary-ar-23p-liberator-penetrator': {
    stats: [
      ['대미지', '65'],
      ['용량', '45'],
      ['반동', '18'],
      ['연사율', '640 RPM'],
    ],
    traits: ['일반 장갑 관통'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '3',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'booster-stamina-enhancement': {
    stats: [],
    traits: [],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%B6%80%EC%8A%A4%ED%84%B0',
    checkedAt: '2026-11-01',
    summary: '최대 스태미나와 스태미나 회복 속도를 높입니다.',
  },
  'primary-r-63cs-diligence-counter-sniper': {
    stats: [
      ['대미지', '200'],
      ['용량', '15'],
      ['반동', '53'],
      ['연사율', '350 RPM'],
    ],
    traits: ['일반 장갑 관통'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '3',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'primary-sg-8s-slugger': {
    stats: [
      ['대미지', '330'],
      ['용량', '16'],
      ['반동', '120'],
      ['연사율', '80 RPM'],
    ],
    traits: ['일반 장갑 관통', '탄약 재장전'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '3',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'throwable-g-3-smoke': {
    stats: [
      ['대미지', '0'],
      ['관통', '0'],
      ['반경', '8 m'],
      ['신관 지연 시간', '2.4초'],
    ],
    traits: ['폭발성'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%ED%88%AC%EC%B2%99%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    summary: '연막으로 적의 시야를 차단합니다. 직접 피해는 없습니다.',
    combat: {
      profiles: [
        {
          label: '연막',
          penetration: '없음',
          demolition: null,
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'booster-muscle-enhancement': {
    stats: [],
    traits: [],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%B6%80%EC%8A%A4%ED%84%B0',
    checkedAt: '2026-11-01',
    summary: '눈·진흙 등 험지에서 이동이 느려지는 효과를 완화합니다.',
  },
  'primary-sg-225sp-breaker-spray-and-pray': {
    stats: [
      ['대미지', '240'],
      ['용량', '26'],
      ['반동', '45'],
      ['연사율', '330 RPM'],
    ],
    traits: ['경장갑 관통'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '2',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'booster-increased-reinforcement-budget': {
    stats: [],
    traits: [],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%B6%80%EC%8A%A4%ED%84%B0',
    checkedAt: '2026-11-01',
    summary: '분대가 사용할 수 있는 증원 횟수를 늘립니다.',
  },
  'primary-plas-1-scorcher': {
    stats: [
      ['대미지', '200'],
      ['용량', '20'],
      ['반동', '20'],
      ['연사율', '350 RPM'],
    ],
    traits: ['일반 장갑 관통', '폭발성'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '2',
          demolition: '10',
        },
        {
          label: '폭발',
          penetration: '중심 3 · 외곽 2 · 충격파 3',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'primary-ar-23c-liberator-concussive': {
    stats: [
      ['대미지', '75'],
      ['용량', '60'],
      ['반동', '28'],
      ['연사율', '400 RPM'],
    ],
    traits: ['경장갑 관통'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    summary: '명중한 적을 밀쳐내는 충격탄을 사용합니다.',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '2',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'secondary-p-4-senator': {
    stats: [
      ['대미지', '225'],
      ['용량', '6'],
      ['반동', '43'],
      ['연사율', '200 RPM'],
    ],
    traits: ['중장갑 관통', '한 손 파지', '탄약 재장전'],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EB%B3%B4%EC%A1%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '4',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'primary-sg-225ie-breaker-incendiary': {
    stats: [
      ['대미지', '240'],
      ['용량', '26'],
      ['반동', '41'],
      ['연사율', '300 RPM'],
    ],
    traits: ['경장갑 관통', '소이'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '2',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'throwable-g-10-incendiary': {
    stats: [
      ['대미지', '300'],
      ['관통', '3'],
      ['반경', '7 m'],
      ['신관 지연 시간', '2.9초'],
    ],
    traits: ['소이', '폭발성'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%ED%88%AC%EC%B2%99%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    summary: '폭발 지점의 적과 지형에 불을 붙입니다.',
    combat: {
      profiles: [
        {
          label: '폭발',
          penetration: '중심 3 · 외곽 2 · 충격파 3',
          demolition: '30',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'booster-flexible-reinforcement-budget': {
    stats: [],
    traits: [],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%B6%80%EC%8A%A4%ED%84%B0',
    checkedAt: '2026-11-01',
    summary: '증원을 모두 소진한 뒤 다음 증원이 충전되는 시간을 줄입니다.',
  },
  'primary-jar-5-dominator': {
    stats: [
      ['대미지', '275'],
      ['용량', '15'],
      ['반동', '75'],
      ['연사율', '250 RPM'],
    ],
    traits: ['일반 장갑 관통'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '3',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'booster-localization-confusion': {
    stats: [],
    traits: [],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%B6%80%EC%8A%A4%ED%84%B0',
    checkedAt: '2026-11-01',
    summary:
      '적 증원이 다시 발생하기까지의 간격을 늘립니다. 임무가 강제로 발생시키는 증원에는 적용되지 않습니다.',
  },
  'primary-las-16-sickle': {
    stats: [
      ['대미지', '60'],
      ['사격 제한', '7초'],
      ['반동', '2'],
      ['연사율', '750 RPM'],
    ],
    traits: ['경장갑 관통', '과열'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    summary: '열을 관리하며 연사하는 레이저 소총입니다. 과열되면 방열판을 교체해야 합니다.',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '2',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'primary-sg-8p-punisher-plasma': {
    stats: [
      ['대미지', '225'],
      ['용량', '10'],
      ['반동', '110'],
      ['연사율', '80 RPM'],
    ],
    traits: ['일반 장갑 관통', '폭발성'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '2',
          demolition: '10',
        },
        {
          label: '폭발',
          penetration: '중심 3 · 외곽 미확인 · 충격파 3',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'throwable-g-23-stun': {
    stats: [
      ['대미지', '0'],
      ['관통', '6'],
      ['반경', '10 m'],
      ['신관 지연 시간', '1.8초'],
    ],
    traits: ['폭발성', '기절'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%ED%88%AC%EC%B2%99%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    summary: '범위 안의 적을 기절시키는 수류탄입니다.',
    combat: {
      profiles: [
        {
          label: '폭발',
          penetration: '중심 4 · 외곽 3 · 충격파 4',
          demolition: '0',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'primary-arc-12-blitzer': {
    stats: [
      ['대미지', '250'],
      ['반동', '60'],
      ['연사율', '45 RPM'],
    ],
    traits: ['일반 장갑 관통'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    summary: '근거리로 전기를 방출하는 무기입니다. 탄약을 소모하지 않습니다.',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '3',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'secondary-las-7-dagger': {
    stats: [
      ['초당 대미지', '250'],
      ['사격 제한', '7초'],
      ['반동', '0'],
    ],
    traits: ['경장갑 관통', '한 손 파지', '광선', '과열'],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EB%B3%B4%EC%A1%B0',
    checkedAt: '2026-11-01',
    summary: '한 손으로 연속 광선을 발사합니다. 과열되면 방열판을 교체합니다.',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '2',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'primary-br-14-adjudicator': {
    stats: [
      ['대미지', '95'],
      ['용량', '30'],
      ['반동', '38'],
      ['연사율', '550 RPM'],
    ],
    traits: ['일반 장갑 관통'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '3',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'throwable-g-123-thermite': {
    stats: [
      ['대미지', '2000'],
      ['관통', '7'],
      ['반경', '3 m'],
      ['신관 지연 시간', '2.9초'],
    ],
    traits: ['대전차', '점착'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%ED%88%AC%EC%B2%99%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    summary: '표면에 부착한 뒤 고열로 장갑을 태우고 폭발합니다.',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '7',
          demolition: null,
        },
        {
          label: '폭발',
          penetration: '중심 7 · 외곽 6 · 충격파 7',
          demolition: '30',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'booster-expert-extraction-pilot': {
    stats: [],
    traits: [],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%B6%80%EC%8A%A4%ED%84%B0',
    checkedAt: '2026-11-01',
    summary: '탈출 수송선이 도착할 때까지의 대기 시간을 줄입니다.',
  },
  'primary-r-36-eruptor': {
    stats: [
      ['대미지', '455'],
      ['용량', '5'],
      ['반동', '75'],
      ['연사율', '32 RPM'],
    ],
    traits: ['중장갑 관통', '폭발성'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '4',
          demolition: '30',
        },
        {
          label: '폭발',
          penetration: '중심 3 · 외곽 2 · 충격파 3',
          demolition: '20',
        },
        {
          label: '파편',
          penetration: '3',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'primary-cb-9-exploding-crossbow': {
    stats: [
      ['대미지', '620'],
      ['용량', '5'],
      ['반동', '35'],
      ['연사율', '50 RPM'],
    ],
    traits: ['일반 장갑 관통', '폭발성', '한 손 파지'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '3',
          demolition: '30',
        },
        {
          label: '폭발',
          penetration: '중심 3 · 외곽 2 · 충격파 3',
          demolition: '20',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'secondary-gp-31-grenade-pistol': {
    stats: [
      ['대미지', '650'],
      ['용량', '1'],
      ['반동', '43'],
      ['연사율', '900 RPM'],
    ],
    traits: ['일반 장갑 관통', '한 손 파지', '폭발성'],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EB%B3%B4%EC%A1%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '3',
          demolition: '30',
        },
        {
          label: '폭발',
          penetration: '중심 3 · 외곽 2 · 충격파 3',
          demolition: '30',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'booster-motivational-shocks': {
    stats: [],
    traits: [],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%B6%80%EC%8A%A4%ED%84%B0',
    checkedAt: '2026-11-01',
    summary:
      '공격으로 부여된 감속의 지속 시간을 줄입니다. EMS처럼 지역에 지속되는 효과는 줄이지 않습니다.',
  },
  'primary-ar-61-tenderizer': {
    stats: [
      ['대미지', '105'],
      ['용량', '35'],
      ['반동', '10'],
      ['연사율', '600 RPM'],
    ],
    traits: ['경장갑 관통'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '2',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'primary-smg-72-pummeler': {
    stats: [
      ['대미지', '85'],
      ['용량', '45'],
      ['반동', '9'],
      ['연사율', '475 RPM'],
    ],
    traits: ['경장갑 관통', '한 손 파지'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    summary: '충격탄으로 적의 움직임을 방해하는 기관단총입니다.',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '2',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'throwable-g-13-incendiary-impact': {
    stats: [
      ['대미지', '150'],
      ['관통', '3'],
      ['반경', '7 m'],
      ['신관 지연 시간', '충격'],
    ],
    traits: ['소이', '폭발성'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%ED%88%AC%EC%B2%99%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    summary: '충돌하면 즉시 터져 주변에 화염을 만듭니다.',
    combat: {
      profiles: [
        {
          label: '폭발',
          penetration: '중심 3 · 외곽 2 · 충격파 3',
          demolition: '30',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'primary-plas-101-purifier': {
    stats: [
      ['대미지 (직격 + 폭발)', '175–500'],
      ['용량', '15'],
      ['반동', '20'],
    ],
    traits: ['일반 장갑 관통', '차지업', '폭발성'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    note: '대미지는 미충전부터 완전 충전까지의 범위입니다.',
    summary: '충전 시간에 따라 직격·폭발 피해가 달라지는 플라스마 소총입니다.',
    combat: {
      profiles: [
        {
          label: '미충전 직격',
          penetration: '3',
          demolition: '10',
        },
        {
          label: '미충전 폭발',
          penetration: '중심 3 · 외곽 2 · 충격파 3',
          demolition: '10',
        },
        {
          label: '충전 직격',
          penetration: '3',
          demolition: '10',
        },
        {
          label: '충전 폭발',
          penetration: '중심 3 · 외곽 2 · 충격파 3',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'secondary-p-113-verdict': {
    stats: [
      ['대미지', '140'],
      ['용량', '10'],
      ['반동', '40'],
      ['연사율', '450 RPM'],
    ],
    traits: ['일반 장갑 관통', '한 손 파지'],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EB%B3%B4%EC%A1%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '3',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'primary-ar-23a-liberator-carbine': {
    stats: [
      ['대미지', '90'],
      ['용량', '45'],
      ['반동', '26'],
      ['연사율', '920 RPM'],
    ],
    traits: ['경장갑 관통'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '2',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'secondary-sg-22-bushwhacker': {
    stats: [
      ['대미지', '405'],
      ['용량', '3'],
      ['반동', '170'],
      ['연사율', '650 RPM'],
    ],
    traits: ['경장갑 관통', '한 손 파지'],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EB%B3%B4%EC%A1%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '2',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'booster-experimental-infusion': {
    stats: [],
    traits: [],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%B6%80%EC%8A%A4%ED%84%B0',
    checkedAt: '2026-11-01',
    summary: '각성제 사용 중 이동 속도를 높이고 받는 피해를 줄입니다.',
  },
  'throwable-k-2-throwing-knife': {
    stats: [
      ['대미지', '300'],
      ['관통', '3'],
    ],
    traits: ['일반 장갑 관통'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%ED%88%AC%EC%B2%99%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    summary: '소음이 적은 투척용 칼입니다.',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '3',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'primary-sg-451-cookout': {
    stats: [
      ['대미지', '320'],
      ['용량', '16'],
      ['반동', '100'],
      ['연사율', '80 RPM'],
    ],
    traits: ['경장갑 관통', '탄약 재장전', '소이'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '2',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'primary-flam-66-torcher': {
    stats: [
      ['초당 대미지', '380'],
      ['용량', '100'],
      ['반동', '2'],
    ],
    traits: ['소이'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    summary: '화염을 연속 분사하는 주무기입니다.',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '4',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'booster-firebomb-hellpods': {
    stats: [],
    traits: [],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%B6%80%EC%8A%A4%ED%84%B0',
    checkedAt: '2026-11-01',
    summary: '헬포드 착지 시 주변에 화염을 발생시킵니다.',
  },
  'secondary-p-72-crisper': {
    stats: [
      ['초당 대미지', '380'],
      ['용량', '30'],
      ['반동', '2'],
    ],
    traits: ['소이', '한 손 파지'],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EB%B3%B4%EC%A1%B0',
    checkedAt: '2026-11-01',
    summary: '한 손으로 화염을 분사하는 보조무기입니다.',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '4',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'throwable-g-4-gas': {
    stats: [
      ['대미지', '3'],
      ['관통', '6'],
      ['반경', '7 m'],
      ['신관 지연 시간', '2.9초'],
    ],
    traits: ['부식성', '폭발성'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%ED%88%AC%EC%B2%99%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    summary: '가스 구름으로 적에게 피해를 주고 시야와 움직임을 방해합니다.',
    combat: {
      profiles: [
        {
          label: '폭발',
          penetration: '중심 4 · 외곽 3 · 충격파 4',
          demolition: '30',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'stratagem-tx-41-sterilizer': {
    stats: [
      ['쿨다운 시간', '480초'],
      ['호출 대기 시간', '7.75초'],
    ],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EC%8A%A4%ED%8A%B8%EB%9D%BC%ED%83%80%EC%A0%AC/%EB%B3%B4%EA%B8%89',
    checkedAt: '2026-11-01',
    summary: '가스를 분사해 피해를 주고 적의 시야와 움직임을 방해하는 지원 무기입니다.',
    note: '함선 모듈 업그레이드를 적용하지 않은 기본 수치입니다.',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '5',
          demolition: '5',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'stratagem-ax-tx-13-dog-breath': {
    stats: [
      ['쿨다운 시간', '480초'],
      ['호출 대기 시간', '9.75초'],
    ],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EC%8A%A4%ED%8A%B8%EB%9D%BC%ED%83%80%EC%A0%AC/%EB%B3%B4%EA%B8%89',
    checkedAt: '2026-11-01',
    summary: '가스를 분사하는 자동 드론입니다. 가스를 보충할 때 배낭으로 복귀합니다.',
    note: '함선 모듈 업그레이드를 적용하지 않은 기본 수치입니다.',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '5',
          demolition: '5',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'secondary-p-11-stim-pistol': {
    stats: [
      ['대미지', '0'],
      ['용량', '6'],
      ['반동', '6'],
      ['연사율', '70 RPM'],
    ],
    traits: ['한 손 파지', '탄약 재장전', '각성'],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EB%B3%B4%EC%A1%B0',
    checkedAt: '2026-11-01',
    summary: '아군에게 각성제를 발사해 회복을 돕는 보조무기입니다.',
    combat: {
      profiles: [
        {
          label: '각성제',
          penetration: '없음',
          demolition: null,
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'booster-dead-sprint': {
    stats: [],
    traits: [],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%B6%80%EC%8A%A4%ED%84%B0',
    checkedAt: '2026-11-01',
    summary: '스태미나가 바닥나도 체력을 소모하여 질주를 이어갑니다.',
  },
  'primary-sg-20-halt': {
    stats: [
      ['대미지', '385'],
      ['용량', '16'],
      ['반동', '120'],
      ['연사율', '80 RPM'],
    ],
    traits: ['경장갑 관통', '일반 장갑 관통', '탄약 재장전', '기절'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    summary: '관통용 플레세트탄과 기절탄을 서로 다른 탄창에 장전하며 전환해서 사용합니다.',
    combat: {
      profiles: [
        {
          label: '플레세트탄',
          penetration: '3',
          demolition: '10',
        },
        {
          label: '기절탄',
          penetration: '2',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'primary-smg-32-reprimand': {
    stats: [
      ['대미지', '140'],
      ['용량', '25'],
      ['반동', '44'],
      ['연사율', '490 RPM'],
    ],
    traits: ['일반 장갑 관통'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '3',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'secondary-plas-15-loyalist': {
    stats: [
      ['대미지 (직격 + 폭발)', '150–375'],
      ['용량', '7'],
      ['반동', '8'],
    ],
    traits: ['일반 장갑 관통', '한 손 파지', '차지업', '폭발성'],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EB%B3%B4%EC%A1%B0',
    checkedAt: '2026-11-01',
    note: '대미지는 미충전부터 완전 충전까지의 범위입니다.',
    summary: '충전 후 방아쇠를 놓으면 폭발성 플라스마 탄을 발사합니다.',
    combat: {
      profiles: [
        {
          label: '미충전 직격',
          penetration: '3',
          demolition: '10',
        },
        {
          label: '미충전 폭발',
          penetration: '중심 3 · 외곽 2 · 충격파 3',
          demolition: '10',
        },
        {
          label: '충전 직격',
          penetration: '3',
          demolition: '10',
        },
        {
          label: '충전 폭발',
          penetration: '중심 3 · 외곽 2 · 충격파 3',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'stratagem-sh-51-directional-shield': {
    stats: [
      ['쿨다운 시간', '300초'],
      ['호출 대기 시간', '9.75초'],
    ],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EC%8A%A4%ED%8A%B8%EB%9D%BC%ED%83%80%EC%A0%AC/%EB%B3%B4%EA%B8%89',
    checkedAt: '2026-11-01',
    summary:
      '전방에 에너지 방패를 펼칩니다. 바깥에서 날아오는 투사체를 막으면서 안쪽에서는 사격할 수 있습니다.',
    note: '함선 모듈 업그레이드를 적용하지 않은 기본 수치입니다.',
  },
  'secondary-cqc-19-stun-lance': {
    stats: [
      ['대미지', '165'],
      ['공격 속도', '117회/분'],
    ],
    traits: ['일반 장갑 관통', '한 손 파지', '기절', '근접 무기'],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EB%B3%B4%EC%A1%B0',
    checkedAt: '2026-11-01',
    summary: '전기가 흐르는 창으로 찔러 적을 기절시킵니다. 한 손으로 사용할 수 있습니다.',
    combat: {
      profiles: [
        {
          label: '근접 타격',
          penetration: '3',
          demolition: null,
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'booster-armed-resupply-pods': {
    stats: [],
    traits: [],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%B6%80%EC%8A%A4%ED%84%B0',
    checkedAt: '2026-11-01',
    summary: '재보급 포드에 자동으로 사격하는 리버레이터 포탑을 장착합니다.',
  },
  'stratagem-a-flam-40-flame-sentry': {
    stats: [
      ['쿨다운 시간', '100초'],
      ['호출 대기 시간', '7.75초'],
    ],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EC%8A%A4%ED%8A%B8%EB%9D%BC%ED%83%80%EC%A0%AC/%EB%B0%A9%EC%96%B4',
    checkedAt: '2026-11-01',
    summary: '화염을 분사하는 자동 포탑입니다. 파괴될 때 연료통이 폭발할 수 있습니다.',
    note: '함선 모듈 업그레이드를 적용하지 않은 기본 수치입니다.',
    combat: {
      profiles: [
        {
          label: '화염방사',
          penetration: '4',
          demolition: '10',
        },
        {
          label: '파괴 시 폭발',
          penetration: '중심 3 · 외곽 2 · 충격파 3',
          demolition: '30',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'stratagem-e-at-12-anti-tank-emplacement': {
    stats: [
      ['쿨다운 시간', '180초'],
      ['호출 대기 시간', '7.75초'],
    ],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EC%8A%A4%ED%8A%B8%EB%9D%BC%ED%83%80%EC%A0%AC/%EB%B0%A9%EC%96%B4',
    checkedAt: '2026-11-01',
    summary: '탑승자가 직접 조준하고 발사하는 대전차 거치포입니다.',
    note: '함선 모듈 업그레이드를 적용하지 않은 기본 수치입니다.',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '6',
          demolition: '30',
        },
        {
          label: '폭발',
          penetration: '중심 3 · 외곽 2 · 충격파 3',
          demolition: '30',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'primary-las-17-double-edge-sickle': {
    stats: [
      ['대미지', '55'],
      ['사격 제한', '15초'],
      ['반동', '2'],
      ['연사율', '700 RPM'],
    ],
    traits: ['경장갑 관통', '과열'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    summary: '과열 시 피해가 증가하지만 사용자도 화상을 입는 레이저 소총입니다.',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '3',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'secondary-gp-20-ultimatum': {
    stats: [
      ['대미지', '3000'],
      ['용량', '1'],
      ['반동', '43'],
      ['연사율', '900 RPM'],
    ],
    traits: ['대전차', '한 손 파지', '폭발성'],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EB%B3%B4%EC%A1%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '6',
          demolition: '40',
        },
        {
          label: '폭발',
          penetration: '중심 6 · 외곽 5 · 충격파 6',
          demolition: '40',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'stratagem-b-100-portable-hellbomb': {
    stats: [
      ['쿨다운 시간', '300초'],
      ['호출 대기 시간', '9.75초'],
    ],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EC%8A%A4%ED%8A%B8%EB%9D%BC%ED%83%80%EC%A0%AC/%EB%B3%B4%EA%B8%89',
    checkedAt: '2026-11-01',
    summary:
      '착용자나 분대원이 기폭을 시작할 수 있는 배낭형 지옥폭탄입니다. 카운트다운이 끝나기 전에 벗어놓아야 합니다.',
    note: '함선 모듈 업그레이드를 적용하지 않은 기본 수치입니다.',
    combat: {
      profiles: [
        {
          label: '폭발',
          penetration: '중심 10 · 외곽 9 · 충격파 10',
          demolition: '60',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'throwable-g-50-seeker': {
    stats: [
      ['대미지', '500'],
      ['관통', '4'],
      ['반경', '7 m'],
      ['신관 지연 시간', '충격'],
    ],
    traits: ['중장갑 관통', '폭발성', '유도'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%ED%88%AC%EC%B2%99%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    summary: '사용자를 따라다니다가 적을 감지하면 돌진하여 폭발하는 드론입니다.',
    combat: {
      profiles: [
        {
          label: '폭발',
          penetration: '중심 4 · 외곽 3 · 충격파 4',
          demolition: '30',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'primary-r-6-deadeye': {
    stats: [
      ['대미지', '300'],
      ['용량', '8'],
      ['반동', '120'],
      ['연사율', '100 RPM'],
    ],
    traits: ['일반 장갑 관통', '탄약 재장전'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '3',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'secondary-las-58-talon': {
    stats: [
      ['대미지', '200'],
      ['용량', '7'],
      ['반동', '2'],
      ['연사율', '750 RPM'],
    ],
    traits: ['일반 장갑 관통', '한 손 파지', '과열'],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EB%B3%B4%EC%A1%B0',
    checkedAt: '2026-11-01',
    summary: '방열판을 교체할 수 있는 레이저 리볼버입니다.',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '3',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'booster-sample-extricator': {
    stats: [],
    traits: [],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%B6%80%EC%8A%A4%ED%84%B0',
    checkedAt: '2026-11-01',
    summary:
      '대형 적 처치 시 샘플이 나올 확률을 추가합니다. 한 임무에서 최대 10개까지 얻을 수 있습니다.',
  },
  'stratagem-lift-860-hover-pack': {
    stats: [
      ['쿨다운 시간', '480초'],
      ['호출 대기 시간', '9.75'],
    ],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EC%8A%A4%ED%8A%B8%EB%9D%BC%ED%83%80%EC%A0%AC/%EB%B3%B4%EA%B8%89',
    checkedAt: '2026-11-01',
    summary: '일정 높이에 잠시 떠오르는 배낭입니다. 공중에 머무르며 조준 사격할 수 있습니다.',
    note: '함선 모듈 업그레이드를 적용하지 않은 기본 수치입니다.',
  },
  'throwable-ted-63-dynamite': {
    stats: [
      ['대미지', '1000'],
      ['관통', '4'],
      ['반경', '12 m'],
      ['신관 지연 시간', '5초 / 15초 / 60초'],
    ],
    traits: ['중장갑 관통', '폭발성'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%ED%88%AC%EC%B2%99%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    summary: '기폭 시간을 5초·15초·60초로 선택할 수 있는 폭탄입니다.',
    combat: {
      profiles: [
        {
          label: '폭발',
          penetration: '중심 4 · 외곽 3 · 충격파 4',
          demolition: '40',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'primary-r-2-amendment': {
    stats: [
      ['대미지', '200'],
      ['용량', '20'],
      ['반동', '29'],
      ['연사율', '480 RPM'],
    ],
    traits: ['경장갑 관통'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '탄환',
          penetration: '2',
          demolition: '10',
        },
        {
          label: '총검',
          penetration: null,
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'secondary-cqc-2-saber': {
    stats: [
      ['대미지', '188'],
      ['공격 속도', '150회/분'],
    ],
    traits: ['일반 장갑 관통', '한 손 파지', '근접 무기'],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EB%B3%B4%EC%A1%B0',
    checkedAt: '2026-11-01',
    summary: '한 손으로 사용하는 근접용 검입니다.',
    combat: {
      profiles: [
        {
          label: '근접 타격',
          penetration: '3',
          demolition: null,
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'booster-sample-scanner': {
    stats: [],
    traits: [],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%B6%80%EC%8A%A4%ED%84%B0',
    checkedAt: '2026-11-01',
    summary: '샘플을 주울 때 15% 확률로 획득량이 두 배가 됩니다.',
  },
  'stratagem-cqc-1-one-true-flag': {
    stats: [
      ['쿨다운 시간', '480초'],
      ['호출 대기 시간', '7.75초'],
    ],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EC%8A%A4%ED%8A%B8%EB%9D%BC%ED%83%80%EC%A0%AC/%EB%B3%B4%EA%B8%89',
    checkedAt: '2026-11-01',
    summary: '슈퍼지구 깃발을 장착한 근접 지원 무기입니다.',
    note: '함선 모듈 업그레이드를 적용하지 않은 기본 수치입니다.',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '3',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'throwable-g-142-pyrotech': {
    stats: [
      ['대미지', '50'],
      ['관통', '3'],
      ['반경', '5 m'],
      ['신관 지연 시간', '0.0초'],
    ],
    traits: ['소이', '폭발성'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%ED%88%AC%EC%B2%99%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    summary: '주변에 불꽃을 흩뿌린 뒤 폭발합니다.',
    combat: {
      profiles: [
        {
          label: '폭발',
          penetration: '중심 3 · 외곽 2 · 충격파 3',
          demolition: '30',
        },
        {
          label: '불꽃',
          penetration: '5',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'primary-ar-32-pacifier': {
    stats: [
      ['대미지', '55'],
      ['용량', '40'],
      ['반동', '14'],
      ['연사율', '700 RPM'],
    ],
    traits: ['일반 장갑 관통', '기절'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    summary: '기절 효과를 가진 탄을 발사하는 돌격소총입니다.',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '3',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'booster-stun-pods': {
    stats: [],
    traits: [],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%B6%80%EC%8A%A4%ED%84%B0',
    checkedAt: '2026-11-01',
    summary: '헬포드가 착지하면 주변 유닛에 기절 효과를 줍니다.',
  },
  'stratagem-gl-52-de-escalator': {
    stats: [
      ['쿨다운 시간', '480초'],
      ['호출 대기 시간', '7.75초'],
    ],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EC%8A%A4%ED%8A%B8%EB%9D%BC%ED%83%80%EC%A0%AC/%EB%B3%B4%EA%B8%89',
    checkedAt: '2026-11-01',
    summary: '전기 효과를 발생시키는 아크 유탄을 발사합니다.',
    note: '함선 모듈 업그레이드를 적용하지 않은 기본 수치입니다.',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '0',
          demolition: '10',
        },
        {
          label: '폭발',
          penetration: '중심 6 · 외곽 5 · 충격파 6',
          demolition: '0',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'stratagem-ax-arc-3-k-9': {
    stats: [
      ['쿨다운 시간', '480초'],
      ['호출 대기 시간', '9.75초'],
    ],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EC%8A%A4%ED%8A%B8%EB%9D%BC%ED%83%80%EC%A0%AC/%EB%B3%B4%EA%B8%89',
    checkedAt: '2026-11-01',
    summary: '아크 발사기를 장착한 자동 드론입니다. 번개가 여러 표적을 이어서 공격합니다.',
    note: '함선 모듈 업그레이드를 적용하지 않은 기본 수치입니다.',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '7',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'throwable-g-109-urchin': {
    stats: [
      ['대미지', '0'],
      ['관통', '6'],
      ['반경', '4 m'],
    ],
    traits: ['점착', '기절'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%ED%88%AC%EC%B2%99%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    summary: '표적에 달라붙어 전기 펄스를 반복 방출하며 기절시킵니다.',
    combat: {
      profiles: [
        {
          label: '폭발',
          penetration: '중심 4 · 외곽 3 · 충격파 4',
          demolition: '0',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'stratagem-plas-45-epoch': {
    stats: [
      ['쿨다운 시간', '480초'],
      ['호출 대기 시간', '7.75초'],
    ],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EC%8A%A4%ED%8A%B8%EB%9D%BC%ED%83%80%EC%A0%AC/%EB%B3%B4%EA%B8%89',
    checkedAt: '2026-11-01',
    summary: '충전 후 폭발성 플라스마 탄을 발사합니다. 과충전 시 위험이 있습니다.',
    note: '함선 모듈 업그레이드를 적용하지 않은 기본 수치입니다.',
    combat: {
      profiles: [
        {
          label: '미충전 직격',
          penetration: '4',
          demolition: '10',
        },
        {
          label: '미충전 폭발',
          penetration: '중심 4 · 외곽 3 · 충격파 4',
          demolition: '10',
        },
        {
          label: '충전 직격',
          penetration: '5',
          demolition: '10',
        },
        {
          label: '충전 폭발',
          penetration: '중심 5 · 외곽 4 · 충격파 5',
          demolition: '30',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'primary-vg-70-variable': {
    stats: [
      ['대미지', '85'],
      ['용량', '49'],
      ['반동', '7'],
      ['연사율', '300 / 550 / 750 RPM'],
    ],
    traits: ['경장갑 관통'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    note: '반동은 발사 모드에 따라 달라집니다.',
    summary: '자동·일제 사격·전탄 발사 모드와 세 단계의 발사 속도를 선택할 수 있습니다.',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '2',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'stratagem-a-las-98-laser-sentry': {
    stats: [
      ['쿨다운 시간', '150초'],
      ['호출 대기 시간', '7.75초'],
    ],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EC%8A%A4%ED%8A%B8%EB%9D%BC%ED%83%80%EC%A0%AC/%EB%B0%A9%EC%96%B4',
    checkedAt: '2026-11-01',
    summary: '레이저 광선으로 공격하는 자동 포탑입니다. 사격 중 열이 누적됩니다.',
    note: '함선 모듈 업그레이드를 적용하지 않은 기본 수치입니다.',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '4',
          demolition: '20',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'stratagem-lift-182-warp-pack': {
    stats: [
      ['쿨다운 시간', '480초'],
      ['호출 대기 시간', '9.75'],
    ],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EC%8A%A4%ED%8A%B8%EB%9D%BC%ED%83%80%EC%A0%AC/%EB%B3%B4%EA%B8%89',
    checkedAt: '2026-11-01',
    summary: '짧은 거리를 순간 이동하는 배낭입니다. 과열된 상태에서 사용하면 위험합니다.',
    note: '함선 모듈 업그레이드를 적용하지 않은 기본 수치입니다.',
  },
  'throwable-g-31-arc': {
    stats: [
      ['대미지', '100'],
      ['관통', '4'],
      ['반경', '10 m'],
      ['신관 지연 시간', '0.0초'],
    ],
    traits: ['폭발성', '아크'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%ED%88%AC%EC%B2%99%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    summary: '튀어 오르며 지면에 부딪힐 때마다 전기 공격을 발생시킵니다.',
    combat: {
      profiles: [
        {
          label: '폭발',
          penetration: '중심 6 · 외곽 5 · 충격파 6',
          demolition: '0',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'primary-ar-2-coyote': {
    stats: [
      ['대미지', '75'],
      ['용량', '45'],
      ['반동', '17'],
      ['연사율', '600 RPM'],
    ],
    traits: ['소이', '일반 장갑 관통'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '3',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'stratagem-s-11-speargun': {
    stats: [
      ['쿨다운 시간', '410초'],
      ['호출 대기 시간', '7.75초'],
    ],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EC%8A%A4%ED%8A%B8%EB%9D%BC%ED%83%80%EC%A0%AC/%EB%B3%B4%EA%B8%89',
    checkedAt: '2026-11-01',
    summary: '명중 지점에 가스 구름을 만드는 작살을 발사합니다. 한 발씩 장전합니다.',
    note: '함선 모듈 업그레이드를 적용하지 않은 기본 수치입니다.',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '5',
          demolition: '30',
        },
        {
          label: '폭발',
          penetration: '6',
          demolition: '30',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'stratagem-eat-700-expendable-napalm': {
    stats: [
      ['쿨다운 시간', '140초'],
      ['호출 대기 시간', '7.75초'],
    ],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EC%8A%A4%ED%8A%B8%EB%9D%BC%ED%83%80%EC%A0%AC/%EB%B3%B4%EA%B8%89',
    checkedAt: '2026-11-01',
    summary: '네이팜 집속탄을 발사하는 일회용 지원 무기입니다.',
    note: '함선 모듈 업그레이드를 적용하지 않은 기본 수치입니다.',
    combat: {
      profiles: [
        {
          label: '고폭탄 직격',
          penetration: '3',
          demolition: '30',
        },
        {
          label: '고폭탄 폭발',
          penetration: '중심 6 · 외곽 5 · 충격파 6',
          demolition: '30',
        },
        {
          label: '대공포탄 직격',
          penetration: '0',
          demolition: '30',
        },
        {
          label: '대공포탄 폭발',
          penetration: '중심 6 · 외곽 5 · 충격파 6',
          demolition: '30',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'stratagem-ms-11-solo-silo': {
    stats: [
      ['쿨다운 시간', '180초'],
      ['호출 대기 시간', '7.75초'],
    ],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EC%8A%A4%ED%8A%B8%EB%9D%BC%ED%83%80%EC%A0%AC/%EB%B3%B4%EA%B8%89',
    checkedAt: '2026-11-01',
    summary: '휴대용 조준기로 목표를 지정하는 미사일 사일로입니다. 한 발을 발사합니다.',
    note: '함선 모듈 업그레이드를 적용하지 않은 기본 수치입니다.',
    combat: {
      profiles: [
        {
          label: '폭발 유형 1',
          penetration: '중심 9 · 외곽 8 · 충격파 9',
          demolition: '40',
        },
        {
          label: '폭발 유형 2',
          penetration: '중심 7 · 외곽 6 · 충격파 7',
          demolition: '40',
        },
        {
          label: '후폭풍',
          penetration: '중심 0 · 외곽 2 · 충격파 0',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'throwable-g-7-pineapple': {
    stats: [
      ['대미지', '300'],
      ['관통', '3'],
      ['반경', '10 m'],
      ['신관 지연 시간', '2.4초'],
    ],
    traits: ['일반 장갑 관통', '폭발성'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%ED%88%AC%EC%B2%99%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    summary: '파편형 자탄을 흩뿌리는 집속 수류탄입니다.',
    combat: {
      profiles: [
        {
          label: '주 폭발',
          penetration: '중심 3 · 외곽 2 · 충격파 3',
          demolition: '30',
        },
        {
          label: '자탄 직격',
          penetration: '3',
          demolition: '20',
        },
        {
          label: '자탄 폭발',
          penetration: '중심 3 · 외곽 2 · 충격파 3',
          demolition: '20',
        },
        {
          label: '파편',
          penetration: '3',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'primary-ar-gl-21-one-two': {
    stats: [
      ['대미지', '95'],
      ['용량', '40'],
      ['반동', '13'],
      ['연사율', '650 RPM'],
    ],
    traits: ['경장갑 관통', '폭발성'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    summary: '돌격소총에 유탄 발사기를 결합한 무기입니다. 아래 수치는 소총 사격 기준입니다.',
    combat: {
      profiles: [
        {
          label: '소총탄',
          penetration: '2',
          demolition: '10',
        },
        {
          label: '유탄 직격',
          penetration: '3',
          demolition: '30',
        },
        {
          label: '유탄 폭발',
          penetration: '중심 3 · 외곽 2 · 충격파 3',
          demolition: '30',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'stratagem-ax-flam-75-hot-dog': {
    stats: [
      ['쿨다운 시간', '480초'],
      ['호출 대기 시간', '9.75초'],
    ],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EC%8A%A4%ED%8A%B8%EB%9D%BC%ED%83%80%EC%A0%AC/%EB%B3%B4%EA%B8%89',
    checkedAt: '2026-11-01',
    summary: '화염방사기 드론입니다. 연료 보충이 필요하면 배낭으로 복귀합니다.',
    note: '함선 모듈 업그레이드를 적용하지 않은 기본 수치입니다.',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '4',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'stratagem-cqc-9-defoliation-tool': {
    stats: [],
    traits: ['지원 무기', '근접 무기'],
    source: 'https://blog.ko.playstation.com/2025/11/26/20251126-helldivers2/',
    checkedAt: '2026-11-01',
    summary:
      '회전하는 톱날로 적과 식생을 베는 근접 지원 무기입니다. 표적에 닿아 있는 동안 연속으로 피해를 줍니다.',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '3~5',
          demolition: '10~30',
        },
      ],
      checkedAt: '2026-11-06',
      note: '사용 후 0.5초가 지나면 관통력과 철거력이 증가합니다.',
    },
  },
  'stratagem-m-1000-maxigun': {
    stats: [
      ['쿨다운 시간', '480초'],
      ['호출 대기 시간', '7.75초'],
    ],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EC%8A%A4%ED%8A%B8%EB%9D%BC%ED%83%80%EC%A0%AC/%EB%B3%B4%EA%B8%89',
    checkedAt: '2026-11-01',
    summary:
      '배낭에서 탄약을 공급받는 대용량 미니건입니다. 일반 탄약으로 직접 재장전할 수 없습니다.',
    note: '함선 모듈 업그레이드를 적용하지 않은 기본 수치입니다.',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '3',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'primary-r-72-censor': {
    stats: [
      ['대미지', '165'],
      ['용량', '20'],
      ['반동', '13'],
      ['연사율', '400 RPM'],
    ],
    traits: ['경장갑 관통', '소음'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '2',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'secondary-p-35-re-educator': {
    stats: [
      ['대미지', '60'],
      ['용량', '6'],
      ['반동', '10'],
      ['연사율', '110 RPM'],
    ],
    traits: ['한 손 파지', '부식성', '중장갑 관통'],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EB%B3%B4%EC%A1%B0',
    checkedAt: '2026-11-01',
    summary: '독성 물질을 담은 탄으로 적에게 가스 효과를 부여합니다.',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '4',
          demolition: '1',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'primary-ar-59-suppressor': {
    stats: [
      ['대미지', '80'],
      ['용량', '45'],
      ['반동', '13'],
      ['연사율', '850 RPM'],
    ],
    traits: ['경장갑 관통', '소음'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '2',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'booster-concealed-insertion': {
    stats: [],
    traits: [],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%B6%80%EC%8A%A4%ED%84%B0',
    checkedAt: '2026-11-01',
    summary: '헬포드 착지 지점에 연막을 펼쳐 강하한 분대원의 모습을 가립니다.',
  },
  'stratagem-b-md-c4-pack': {
    stats: [
      ['쿨다운 시간', '480초'],
      ['호출 대기 시간', '7.75초'],
    ],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EC%8A%A4%ED%8A%B8%EB%9D%BC%ED%83%80%EC%A0%AC/%EB%B3%B4%EA%B8%89',
    checkedAt: '2026-11-01',
    summary:
      '점착식 C4 여섯 개와 원격 기폭 장치를 담은 배낭입니다. 폭탄을 하나씩 또는 동시에 기폭할 수 있습니다.',
    note: '함선 모듈 업그레이드를 적용하지 않은 기본 수치입니다.',
    combat: {
      profiles: [
        {
          label: '폭발',
          penetration: '중심 7 · 외곽 6 · 충격파 7',
          demolition: '40',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'throwable-tm-1-lure-mine': {
    stats: [
      ['대미지', '1000'],
      ['관통', '5'],
      ['반경', '8 m'],
      ['신관 지연 시간', '적 근접 시 기폭'],
    ],
    traits: ['대전차', '점착', '폭발성'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%ED%88%AC%EC%B2%99%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    summary: '표면에 붙는 근접 기폭 지뢰입니다. 빛과 소리로 주변 적을 유인합니다.',
    combat: {
      profiles: [
        {
          label: '폭발',
          penetration: '중심 5 · 외곽 4 · 충격파 5',
          demolition: '30',
        },
        {
          label: '파편',
          penetration: '3',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'primary-las-13-trident': {
    stats: [
      ['대미지', '360'],
      ['사격 제한', '2초'],
      ['반동', '2'],
      ['연사율', '300 RPM'],
    ],
    traits: ['경장갑 관통', '과열'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    summary: '여섯 갈래의 광선을 발사하는 산탄총형 에너지 무기입니다.',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '2',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'stratagem-cqc-20-breaching-hammer': {
    stats: [
      ['쿨다운 시간', '480초'],
      ['호출 대기 시간', '7.75초'],
    ],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EC%8A%A4%ED%8A%B8%EB%9D%BC%ED%83%80%EC%A0%AC/%EB%B3%B4%EA%B8%89',
    checkedAt: '2026-11-01',
    summary: '머리에 폭약을 장착할 수 있는 근접용 망치입니다. 폭약 없이도 휘두를 수 있습니다.',
    note: '함선 모듈 업그레이드를 적용하지 않은 기본 수치입니다.',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '3',
          demolition: '30',
        },
        {
          label: '폭발',
          penetration: '중심 5 · 외곽 5 · 충격파 5',
          demolition: '30',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'stratagem-eat-411-leveller': {
    stats: [
      ['쿨다운 시간', '140초'],
      ['호출 대기 시간', '7.75초'],
    ],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EC%8A%A4%ED%8A%B8%EB%9D%BC%ED%83%80%EC%A0%AC/%EB%B3%B4%EA%B8%89',
    checkedAt: '2026-11-01',
    summary: '고위력 미사일을 한 번 발사한 뒤 폐기하는 지원 무기입니다.',
    note: '함선 모듈 업그레이드를 적용하지 않은 기본 수치입니다.',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '6',
          demolition: '40',
        },
        {
          label: '폭발',
          penetration: '중심 6 · 외곽 5 · 충격파 6',
          demolition: '40',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'stratagem-gl-28-belt-fed-grenade-launcher': {
    stats: [
      ['쿨다운 시간', '480초'],
      ['호출 대기 시간', '7.75초'],
    ],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EC%8A%A4%ED%8A%B8%EB%9D%BC%ED%83%80%EC%A0%AC/%EB%B3%B4%EA%B8%89',
    checkedAt: '2026-11-01',
    summary: '벨트 급탄으로 유탄을 연속 발사하는 지원 무기입니다.',
    note: '함선 모듈 업그레이드를 적용하지 않은 기본 수치입니다.',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '4',
          demolition: '10',
        },
        {
          label: '폭발',
          penetration: '중심 4 · 외곽 4 · 충격파 4',
          demolition: '30',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'throwable-g-sh-39-shield': {
    stats: [
      ['대미지', '75'],
      ['관통', '3'],
      ['반경', '6 m'],
    ],
    traits: ['점착'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%ED%88%AC%EC%B2%99%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    summary: '충돌한 위치에 투사체를 막는 구형 방어막을 잠시 펼칩니다.',
    combat: {
      profiles: [
        {
          label: '일반 정보',
          penetration: '3',
          demolition: null,
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'primary-smg-flam-34-stoker': {
    stats: [
      ['대미지', '130'],
      ['용량', '45'],
      ['반동', '9'],
      ['연사율', '420 RPM'],
    ],
    traits: ['경장갑 관통', '한 손 파지', '소이'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '탄환',
          penetration: '2',
          demolition: '10',
        },
        {
          label: '화염방사',
          penetration: '4',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'secondary-cqc-73-entrenchment-tool': {
    stats: [
      ['대미지', '165'],
      ['공격 속도', '1.28회/초'],
      ['스태미나 소모', '3%'],
    ],
    traits: ['일반 장갑 관통', '한 손 파지', '근접 무기', '기절'],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EB%B3%B4%EC%A1%B0',
    checkedAt: '2026-11-01',
    summary: '근접 공격과 지형 굴착에 사용하는 삽입니다.',
    combat: {
      profiles: [
        {
          label: '근접 타격',
          penetration: '3',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'throwable-g-48-giga-grenade': {
    stats: [
      ['대미지', '2000'],
      ['관통', '5'],
      ['반경', '12 m'],
      ['신관 지연 시간', '충격'],
    ],
    traits: ['대전차', '폭발성'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%ED%88%AC%EC%B2%99%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    summary: '충격으로 기폭하는 고위력 수류탄입니다. 무거워 투척 거리가 짧습니다.',
    combat: {
      profiles: [
        {
          label: '폭발',
          penetration: '중심 5 · 외곽 4 · 충격파 5',
          demolition: '40',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'stratagem-a-gm-17-gas-mortar-sentry': {
    stats: [
      ['쿨다운 시간', '180초'],
      ['호출 대기 시간', '7.75초'],
    ],
    traits: ['센트리', '부식성'],
    source: 'https://blog.ko.playstation.com/?p=31024',
    checkedAt: '2026-11-01',
    additionalSource: 'https://helldivers.wiki.gg/wiki/A/GM-17_Gas_Mortar_Sentry',
    summary:
      '가스탄을 곡사로 발사하는 자동 박격포입니다. 아직 가스에 노출되지 않은 적을 우선 공격합니다.',
    note: '함선 모듈 업그레이드를 적용하지 않은 기본 수치입니다.',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '0',
          demolition: '10',
        },
        {
          label: '폭발',
          penetration: '중심 6 · 외곽 5 · 충격파 6',
          demolition: '30',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'secondary-p-69-veto': {
    stats: [
      ['대미지', '105'],
      ['용량', '12'],
      ['반동', '30'],
      ['연사율', '750 RPM'],
    ],
    traits: ['일반 장갑 관통', '한 손 파지', '탄약 재장전'],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EB%B3%B4%EC%A1%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '3',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'stratagem-b-flam-80-cremator': {
    stats: [
      ['쿨다운 시간', '480초'],
      ['호출 대기 시간', '7.75초'],
    ],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EC%8A%A4%ED%8A%B8%EB%9D%BC%ED%83%80%EC%A0%AC/%EB%B3%B4%EA%B8%89',
    checkedAt: '2026-11-01',
    summary:
      '배낭형 연료 탱크를 연결한 중화기 화염방사기입니다. 긴 시간 화염을 분사할 수 있습니다.',
    note: '함선 모듈 업그레이드를 적용하지 않은 기본 수치입니다.',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '4',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'primary-smg-203-gallant': {
    stats: [
      ['대미지', '65'],
      ['용량', '50'],
      ['반동', '15'],
      ['연사율', '1380 RPM'],
    ],
    traits: ['일반 장갑 관통', '한 손 파지'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '3',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'stratagem-mgx-42-bullet-storm': {
    stats: [
      ['쿨다운 시간', '70초'],
      ['호출 대기 시간', '6.75초'],
    ],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EC%8A%A4%ED%8A%B8%EB%9D%BC%ED%83%80%EC%A0%AC/%EB%B3%B4%EA%B8%89',
    checkedAt: '2026-11-01',
    summary:
      '여러 총열에서 무탄피 탄약을 고속으로 발사하는 일회용 기관총입니다. 한 번 호출하면 두 정이 지급됩니다.',
    note: '함선 모듈 업그레이드를 적용하지 않은 기본 수치입니다.',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '2',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'stratagem-exo-51-lumberer-exosuit': {
    stats: [
      ['쿨다운 시간', '420초'],
      ['호출 대기 시간', '10.5초'],
    ],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EC%8A%A4%ED%8A%B8%EB%9D%BC%ED%83%80%EC%A0%AC/%EB%B3%B4%EA%B8%89',
    checkedAt: '2026-11-01',
    summary: '대전차포와 화염방사기를 장착한 탑승형 엑소슈트입니다.',
    note: '함선 모듈 업그레이드를 적용하지 않은 기본 수치입니다.',
    combat: {
      profiles: [
        {
          label: '화염방사',
          penetration: '4',
          demolition: '10',
        },
        {
          label: '대전차포 직격',
          penetration: '6',
          demolition: '30',
        },
        {
          label: '대전차포 폭발',
          penetration: '중심 3 · 외곽 2 · 충격파 3',
          demolition: '30',
        },
        {
          label: '파괴 시 폭발',
          penetration: '중심 3 · 외곽 2 · 충격파 3',
          demolition: '50',
        },
        {
          label: '밟기',
          penetration: '4',
          demolition: '30',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'secondary-p-33-missile-pistol': {
    stats: [
      ['대미지', '1300'],
      ['용량', '1'],
      ['반동', '313'],
      ['연사율', '60 RPM'],
    ],
    traits: ['일반 장갑 관통', '대전차', '한 손 파지', '유도', '폭발성'],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EB%B3%B4%EC%A1%B0',
    checkedAt: '2026-11-01',
    summary: '표적을 조준 고정하여 유도 미사일을 발사하는 권총입니다.',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '5',
          demolition: '30',
        },
        {
          label: '폭발',
          penetration: '중심 3 · 외곽 2 · 충격파 3',
          demolition: '30',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'stratagem-exo-55-breakthrough-exosuit': {
    stats: [
      ['쿨다운 시간', '420초'],
      ['호출 대기 시간', '10.5초'],
    ],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EC%8A%A4%ED%8A%B8%EB%9D%BC%ED%83%80%EC%A0%AC/%EB%B3%B4%EA%B8%89',
    checkedAt: '2026-11-01',
    summary: '대공포와 방탄 방패를 장착한 탑승형 엑소슈트입니다.',
    note: '함선 모듈 업그레이드를 적용하지 않은 기본 수치입니다.',
    combat: {
      profiles: [
        {
          label: '방패 타격',
          penetration: '4',
          demolition: '30~40',
        },
        {
          label: '산탄',
          penetration: '4',
          demolition: '30',
        },
        {
          label: '파괴 시 폭발',
          penetration: '중심 3 · 외곽 2 · 충격파 3',
          demolition: '50',
        },
        {
          label: '밟기',
          penetration: '4',
          demolition: '30',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'primary-ar-11-arbitrator': {
    stats: [
      ['대미지', '70'],
      ['용량', '45'],
      ['반동', '13'],
      ['연사율', '1200 RPM'],
    ],
    traits: ['경장갑 관통'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    summary:
      '무탄피 탄약을 연사하며 하부에 산탄총을 장착했습니다. 아래 수치는 소총 사격 기준입니다.',
    combat: {
      profiles: [
        {
          label: '소총탄',
          penetration: '2',
          demolition: '10',
        },
        {
          label: '하부 산탄총',
          penetration: '3',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'throwable-g-8-immolation': {
    stats: [
      ['대미지', '20'],
      ['관통', '0'],
      ['반경', '10 m'],
      ['신관 지연 시간', '충격'],
    ],
    traits: ['소이'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%ED%88%AC%EC%B2%99%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    summary: '충돌 지점에 지속되는 화염 지대를 만듭니다. 폭발 피해 없이 발화합니다.',
    combat: {
      profiles: [
        {
          label: '폭발',
          penetration: '중심 0 · 외곽 0 · 충격파 0',
          demolition: '0',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'secondary-p-34-breacher': {
    stats: [
      ['대미지', '2000'],
      ['용량', '1'],
      ['반동', '313'],
      ['연사율', '20 RPM'],
    ],
    traits: ['한 손 파지', '대전차', '점착', '폭발성'],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EB%B3%B4%EC%A1%B0',
    checkedAt: '2026-11-01',
    summary: '표면에 붙은 뒤 연소하고 폭발하는 점착탄을 발사합니다.',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '4',
          demolition: '15',
        },
        {
          label: '폭발',
          penetration: '중심 7 · 외곽 6 · 충격파 7',
          demolition: '30',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'booster-integrated-extinguishers': {
    stats: [],
    traits: [],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%B6%80%EC%8A%A4%ED%84%B0',
    checkedAt: '2026-11-01',
    summary: '몸에 붙은 불이 자연적으로 꺼질 때까지의 시간을 단축합니다.',
  },
  'primary-gl-15-evictor': {
    stats: [
      ['대미지', '490'],
      ['용량', '4'],
      ['반동', '120'],
      ['연사율', '60 RPM'],
    ],
    traits: ['일반 장갑 관통', '폭발성', '탄약 재장전'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '3',
          demolition: '10',
        },
        {
          label: '폭발',
          penetration: '중심 3 · 외곽 2 · 충격파 3',
          demolition: '30',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'throwable-g-60-anti-tank-seeker': {
    stats: [
      ['대미지', '1800'],
      ['관통', '5'],
      ['반경', '12 m'],
      ['신관 지연 시간', '충격'],
    ],
    traits: ['대전차', '폭발성', '유도'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%ED%88%AC%EC%B2%99%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    summary: '사용자를 따라다니다가 적에게 돌진하여 폭발하는 대전차 드론입니다.',
    combat: {
      profiles: [
        {
          label: '폭발',
          penetration: '중심 5 · 외곽 4 · 충격파 5',
          demolition: '40',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'booster-surplus-eat-allocation': {
    stats: [],
    traits: [],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%B6%80%EC%8A%A4%ED%84%B0',
    checkedAt: '2026-11-01',
    summary: '임무마다 일회성 대전차 스트라타젬을 추가로 두 번 호출할 수 있습니다.',
  },
  'primary-r-40-sightliner': {
    stats: [
      ['대미지', '350'],
      ['용량', '10'],
      ['반동', '87.5'],
      ['연사율', '40 RPM'],
    ],
    traits: ['중장갑 관통'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '4',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'throwable-g-11-caltrops': {
    stats: [
      ['대미지', '50'],
      ['관통', '3'],
      ['반경', '10 m'],
      ['신관 지연 시간', '적 근접 시 기폭'],
    ],
    traits: ['기절', '점착'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%ED%88%AC%EC%B2%99%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    summary: '주변에 근접 기폭 자탄을 흩뿌립니다. 피해는 낮지만 적을 기절시키고 느리게 만듭니다.',
    combat: {
      profiles: [
        {
          label: '폭발',
          penetration: '중심 3 · 외곽 2 · 충격파 3',
          demolition: '10',
        },
        {
          label: '기절 효과',
          penetration: '중심 3 · 외곽 2 · 충격파 3',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'stratagem-amw-20-apex': {
    stats: [
      ['쿨다운 시간', '480초'],
      ['호출 대기 시간', '7.75초'],
    ],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EC%8A%A4%ED%8A%B8%EB%9D%BC%ED%83%80%EC%A0%AC/%EB%B3%B4%EA%B8%89',
    checkedAt: '2026-11-01',
    summary:
      '배낭에서 20mm 탄약을 공급하는 대물 저격소총입니다. 반동 때문에 웅크리거나 엎드린 자세로 발사합니다.',
    note: '함선 모듈 업그레이드를 적용하지 않은 기본 수치입니다.',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '5',
          demolition: '30',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'stratagem-las-44-nova': {
    stats: [
      ['쿨다운 시간', '480초'],
      ['호출 대기 시간', '7.75초'],
    ],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EC%8A%A4%ED%8A%B8%EB%9D%BC%ED%83%80%EC%A0%AC/%EB%B3%B4%EA%B8%89',
    checkedAt: '2026-11-01',
    summary:
      '짧게 충전한 후 비폭발성 열 발사체를 쏩니다. 탄약을 소모하지 않으며 발사 후 열을 식힙니다.',
    note: '함선 모듈 업그레이드를 적용하지 않은 기본 수치입니다.',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '5',
          demolition: '17',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'secondary-p-44-mist': {
    stats: [
      ['대미지', '110'],
      ['용량', '25'],
      ['반동', '17'],
      ['연사율', '400 RPM'],
    ],
    traits: ['경장갑 관통', '한 손 파지'],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EB%B3%B4%EC%A1%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '2',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'primary-ma5c-assault-rifle': {
    stats: [
      ['대미지', '90'],
      ['용량', '32'],
      ['반동', '19'],
      ['연사율', '640 RPM'],
    ],
    traits: ['일반 장갑 관통'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '3',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'primary-m7s-smg': {
    stats: [
      ['대미지', '90'],
      ['용량', '48'],
      ['반동', '8'],
      ['연사율', '872 RPM'],
    ],
    traits: ['경장갑 관통', '한 손 파지', '소음'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '2',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'primary-m90a-shotgun': {
    stats: [
      ['대미지', '726'],
      ['용량', '6'],
      ['반동', '120'],
      ['연사율', '80 RPM'],
    ],
    traits: ['경장갑 관통', '탄약 재장전'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '2',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'secondary-m6c-socom-pistol': {
    stats: [
      ['대미지', '125'],
      ['용량', '12'],
      ['반동', '20'],
      ['연사율', '900 RPM'],
    ],
    traits: ['경장갑 관통', '한 손 파지', '소음'],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EB%B3%B4%EC%A1%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '2',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'primary-sta-52-assault-rifle': {
    stats: [
      ['대미지', '90'],
      ['용량', '56'],
      ['반동', '19'],
      ['연사율', '790 RPM'],
    ],
    traits: ['경장갑 관통'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '2',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'primary-plas-39-accelerator-rifle': {
    stats: [
      ['대미지', '350'],
      ['용량', '9'],
      ['반동', '3'],
      ['연사율', '550 RPM'],
    ],
    traits: ['일반 장갑 관통', '폭발성'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    summary: '충전 후 점사하는 플라스마 소총입니다.',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '3',
          demolition: '10',
        },
        {
          label: '폭발',
          penetration: '중심 3 · 외곽 2 · 충격파 3',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'primary-sta-11-smg': {
    stats: [
      ['대미지', '100'],
      ['용량', '48'],
      ['반동', '13'],
      ['연사율', '1050 RPM'],
    ],
    traits: ['경장갑 관통', '한 손 파지'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '2',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'primary-r-40-k-hot-shot-marksman-rifle': {
    stats: [
      ['대미지', '275'],
      ['용량', '12'],
      ['반동', '19'],
      ['연사율', '210 RPM'],
    ],
    traits: ['일반 장갑 관통'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EC%A3%BC%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '3',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'throwable-g-40-k-melta-mine': {
    stats: [
      ['대미지', '3200'],
      ['관통', '7'],
      ['반경', '6 m'],
      ['신관 지연 시간', '적 근접 시 기폭'],
    ],
    traits: ['대전차', '폭발성'],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%ED%88%AC%EC%B2%99%20%EB%AC%B4%EA%B8%B0',
    checkedAt: '2026-11-01',
    summary: '적이 접근하면 강력한 열에너지로 기폭하는 일회용 지뢰입니다.',
    combat: {
      profiles: [
        {
          label: '폭발',
          penetration: '중심 7 · 외곽 6 · 충격파 7',
          demolition: '40',
        },
        {
          label: '불기둥',
          penetration: '7',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'secondary-p-40-k-bolt-pistol': {
    stats: [
      ['대미지', '500'],
      ['용량', '6'],
      ['반동', '325'],
      ['연사율', '150 RPM'],
    ],
    traits: ['중장갑 관통', '한 손 파지', '폭발성'],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%AC%B4%EA%B8%B0/%EB%B3%B4%EC%A1%B0',
    checkedAt: '2026-11-01',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '4',
          demolition: '20',
        },
        {
          label: '폭발',
          penetration: '중심 3 · 외곽 2 · 충격파 3',
          demolition: '10',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'stratagem-40-k-meltagun': {
    stats: [
      ['쿨다운 시간', '480초'],
      ['호출 대기 시간', '7.75초'],
    ],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EC%8A%A4%ED%8A%B8%EB%9D%BC%ED%83%80%EC%A0%AC/%EB%B3%B4%EA%B8%89',
    checkedAt: '2026-11-01',
    summary: '근거리에서 고열 에너지를 방출하는 대장갑 지원 무기입니다.',
    note: '함선 모듈 업그레이드를 적용하지 않은 기본 수치입니다.',
    combat: {
      profiles: [
        {
          label: '직격',
          penetration: '7',
          demolition: '30',
        },
      ],
      checkedAt: '2026-11-06',
    },
  },
  'armor-acclimated': {
    summary: '화염, 가스, 산성, 전기 대미지에 대한 저항력을 50% 제공합니다.',
    stats: [],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%B0%A9%EC%96%B4%EA%B5%AC#%EC%A0%81%EC%9D%91%EB%A0%A5',
    checkedAt: '2026-11-01',
  },
  'armor-adreno-defibrillator': {
    summary:
      '헬다이버의 신체가 아직 온전한 경우, 사망 시 지속 시간이 짧은 일회성 소생술을 제공합니다. 각성제 지속 시간이 2.0초 증가합니다. 아크 대미지에 대한 저항력을 50% 제공합니다.',
    stats: [],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%B0%A9%EC%96%B4%EA%B5%AC#%EC%95%84%EB%93%9C%EB%A0%88%EB%85%B8-%EC%A0%9C%EC%84%B8%EB%8F%99%EA%B8%B0',
    checkedAt: '2026-11-01',
  },
  'armor-advanced-filtration': {
    summary: '가스 대미지 및 효과에 대한 저항력을 80% 제공합니다.',
    stats: [],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%B0%A9%EC%96%B4%EA%B5%AC#%EA%B3%A0%EA%B8%89%20%EC%97%AC%EA%B3%BC',
    checkedAt: '2026-11-01',
  },
  'armor-extra-padding': {
    summary: '더 높은 장갑 등급을 제공합니다.',
    stats: [],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%B0%A9%EC%96%B4%EA%B5%AC#%EC%B6%94%EA%B0%80%20%EC%99%84%EC%B6%A9%EC%A0%9C',
    checkedAt: '2026-11-01',
  },
  'armor-blunt-force-mitigation': {
    summary:
      '지니고 있으면 넘어짐에 대한 저항력이 높아집니다. 충격 및 충돌로 인한 손상을 30% 만큼 줄입니다. 더 높은 장갑 등급을 제공합니다.',
    stats: [],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%B0%A9%EC%96%B4%EA%B5%AC#%EB%91%94%EA%B8%B0%20%EC%B6%A9%EA%B2%A9%20%EC%99%84%ED%99%94',
    checkedAt: '2026-11-01',
  },
  'armor-ballistic-padding': {
    summary:
      '가슴 부위에 입는 대미지에 대한 저항력을 25% 제공합니다. 폭발 대미지에 대한 저항력을 25% 제공합니다. 흉부 출혈 시 출혈로 인한 모든 대미지를 방지합니다.',
    stats: [],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%B0%A9%EC%96%B4%EA%B5%AC#%ED%83%84%EB%8F%84%20%EC%99%84%EC%B6%A9%EC%A0%9C',
    checkedAt: '2026-11-01',
  },
  'armor-engineering-kit': {
    summary:
      '앉거나 포복할 때 반동이 추가로 30% 감소합니다. 투척 무기의 초기 인벤토리와 소지 용량이 +2 증가합니다.',
    stats: [],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%B0%A9%EC%96%B4%EA%B5%AC#%EA%B3%B5%EB%B3%91%20%ED%82%A4%ED%8A%B8',
    checkedAt: '2026-11-01',
  },
  'armor-med-kit': {
    summary:
      '각성제의 초기 인벤토리와 소지 용량이 +2 증가합니다. 각성제 지속 시간이 2.0초 증가합니다.',
    stats: [],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%B0%A9%EC%96%B4%EA%B5%AC#%EA%B5%AC%EA%B8%89%20%ED%82%A4%ED%8A%B8',
    checkedAt: '2026-11-01',
  },
  'armor-concussive-padding-hazmat': {
    summary: '폭발 피해 50%, 가스 피해·효과 25% 저항. 보조무기 반동 30% 감소.',
    stats: [],
    traits: [],
    source: 'https://helldivers.wiki.gg/wiki/Armor_Passives',
    checkedAt: '2026-11-01',
  },
  'armor-scout': {
    summary:
      '지도에 배치한 마커가 2.0초 간격으로 레이더 스캔을 생성합니다. 적이 착용자를 탐지할 수 있는 거리가 30% 감소합니다.',
    stats: [],
    traits: [],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%B0%A9%EC%96%B4%EA%B5%AC#%EC%A0%95%EC%B0%B0',
    checkedAt: '2026-11-01',
  },
  'armor-desert-stormer': {
    summary:
      '화염, 가스, 산성, 전기 대미지에 대한 저항력을 40% 제공합니다. 투척 거리가 20% 증가합니다.',
    stats: [],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%B0%A9%EC%96%B4%EA%B5%AC#%EC%82%AC%EB%A7%89%20%EB%8F%8C%EA%B2%A9%EB%8C%80',
    checkedAt: '2026-11-01',
  },
  'armor-electrical-conduit': {
    summary: '아크 대미지에 대한 저항력을 95% 제공합니다.',
    stats: [],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%B0%A9%EC%96%B4%EA%B5%AC#%EC%A0%84%EB%8F%84%EC%84%B1',
    checkedAt: '2026-11-01',
  },
  'armor-fortified': {
    summary:
      '앉거나 포복할 때 반동이 추가로 30% 감소합니다. 폭발 대미지에 대한 저항력을 50% 제공합니다.',
    stats: [],
    traits: [],
    source: 'https://www.namu.moe/w/HELLDIVERS%202/%EB%B0%A9%EC%96%B4%EA%B5%AC#%EA%B0%95%ED%99%94',
    checkedAt: '2026-11-01',
  },
  'armor-gunslinger': {
    summary:
      '보조 무기 재장전 속도가 40% 상승합니다. 보조 무기 집어 올리기/집어 넣기 속도가 50% 상승합니다. 보조 무기 반동이 70% 감소합니다.',
    stats: [],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%B0%A9%EC%96%B4%EA%B5%AC#%EC%B4%9D%EC%9E%A1%EC%9D%B4',
    checkedAt: '2026-11-01',
  },
  'armor-inflammable': {
    summary:
      '화염 대미지에 대한 저항력을 75% 제공하여, 착용자에게 화염에 대한 자신감을 부여합니다.',
    stats: [],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%B0%A9%EC%96%B4%EA%B5%AC#%EC%9D%B8%ED%99%94%EC%84%B1%20%EB%AC%BC%EC%A7%88',
    checkedAt: '2026-11-01',
  },
  'armor-integrated-explosives': {
    summary:
      '착용자가 사망한 뒤 1.5초 후 방어구가 폭발합니다. 투척 무기의 초기 인벤토리와 소지 용량이 +2 증가합니다.',
    stats: [],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%B0%A9%EC%96%B4%EA%B5%AC#%ED%86%B5%ED%95%A9%20%ED%8F%AD%EB%B0%9C%EB%AC%BC',
    checkedAt: '2026-11-01',
  },
  'armor-oxygenator': {
    summary: '걷기·달리기 속도 증가. 슬라이딩 속도·지속 시간 증가.',
    stats: [],
    traits: [],
    source: 'https://helldivers.wiki.gg/wiki/Oxygenator',
    checkedAt: '2026-11-01',
  },
  'armor-peak-physique': {
    summary:
      '근접 공격 대미지가 40% 증가합니다. 무기 취급 능력이 향상되어 무기 움직임에 휘둘리지 않습니다.',
    stats: [],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%B0%A9%EC%96%B4%EA%B5%AC#%EC%9D%B4%EC%83%81%EC%A0%81%EC%9D%B8%20%EC%B2%B4%ED%98%95',
    checkedAt: '2026-11-01',
  },
  'armor-reinforced-epaulettes': {
    summary:
      '주 무기의 재장전 속도가 30% 증가합니다. 착용자는 50% 확률로 치명적인 사지 부상을 피할 수 있습니다. 근접 공격 대미지가 20% 증가합니다.',
    stats: [],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%B0%A9%EC%96%B4%EA%B5%AC#%EA%B0%95%ED%99%94%EB%90%9C%20%EA%B2%AC%EC%9E%A5',
    checkedAt: '2026-11-01',
  },
  'armor-rock-solid': {
    summary: '근접 공격 대미지가 40% 증가합니다. 지니고 있으면 넘어짐에 대한 저항력이 높아집니다.',
    stats: [],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%B0%A9%EC%96%B4%EA%B5%AC#%EA%B5%B3%EA%B1%B4%ED%95%9C%20%EB%B0%94%EC%9C%84',
    checkedAt: '2026-11-01',
  },
  'armor-reduced-signature': {
    summary:
      '착용하면 이동 시 소음이 50%만큼 줄어듭니다. 적이 착용자를 탐지할 수 있는 거리가 40% 감소합니다.',
    stats: [],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%B0%A9%EC%96%B4%EA%B5%AC#%EC%8B%A0%ED%98%B8%20%EA%B0%90%EC%86%8C',
    checkedAt: '2026-11-01',
  },
  'armor-servo-assisted': {
    summary: '투척 거리가 30% 증가합니다. +50%의 사지 체력을 제공합니다.',
    stats: [],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%B0%A9%EC%96%B4%EA%B5%AC#%EC%84%9C%EB%B3%B4%20%EB%B3%B4%EC%A1%B0',
    checkedAt: '2026-11-01',
  },
  'armor-siege-ready': {
    summary:
      '주 무기의 재장전 속도가 30% 증가합니다. 모든 무기의 탄약 용량이 20% 증가합니다. 무기 배낭에는 영향을 주지 않습니다.',
    stats: [],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%B0%A9%EC%96%B4%EA%B5%AC#%ED%8F%AC%EC%9C%84%20%EC%A4%80%EB%B9%84%20%EC%99%84%EB%A3%8C',
    checkedAt: '2026-11-01',
  },
  'armor-unflinching': {
    summary:
      '헬다이버가 피격 시에도 주저하지 않을 수 있도록 도와줍니다. 더 높은 장갑 등급을 제공합니다. 지도에 배치한 마커가 2.0초 간격으로 레이더 스캔을 생성합니다.',
    stats: [],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%B0%A9%EC%96%B4%EA%B5%AC#%EA%B2%B0%EC%97%B0%ED%95%A8',
    checkedAt: '2026-11-01',
  },
  'armor-feet-first': {
    summary:
      '착용하면 이동 시 소음이 50% 만큼 줄어듭니다. 관심 지점 인식 범위가 30% 만큼 증가합니다. 다리 부상에 면역이 생깁니다.',
    stats: [],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%B0%A9%EC%96%B4%EA%B5%AC#%EB%B0%9C%20%EB%A8%BC%EC%A0%80',
    checkedAt: '2026-11-01',
  },
  'armor-democracy-protects': {
    summary:
      '치명적 대미지에도 50% 확률로 사망하지 않습니다. 흉부 출혈 시 출혈로 인한 모든 대미지를 방지합니다.',
    stats: [],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%B0%A9%EC%96%B4%EA%B5%AC#%EB%AF%BC%EC%A3%BC%EC%A3%BC%EC%9D%98%EC%9D%98%20%EA%B0%80%ED%98%B8',
    checkedAt: '2026-11-01',
  },
  'armor-kinetic-displacement-mitigation': {
    summary: '화염 피해 50% 저항. 사지 부상 회피 확률 50%, 충격·충돌 피해 30% 감소.',
    stats: [],
    traits: [],
    source: 'https://helldivers.wiki.gg/wiki/Armor_Passives',
    checkedAt: '2026-11-01',
  },
  'armor-stationary-shroud': {
    summary:
      '조준 시 무기 흔들림이 35%만큼 감소합니다. 착용하면 이동 시 소음이 15%만큼 줄어듭니다. 나뭇잎과 유사한 은폐 효과를 통해 착용자가 움직이지 않고 웅크리거나 엎드린 자세를 유지하는 동안 적의 탐지 범위를 줄여줍니다.',
    stats: [],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%B0%A9%EC%96%B4%EA%B5%AC#%EC%A0%95%EC%A0%81%EC%9D%B8%20%EC%9E%A5%EB%A7%89',
    checkedAt: '2026-11-01',
  },
  'armor-true-grit': {
    summary:
      '지원 무기의 재장전 속도가 30% 증가합니다. 무기의 인체공학 설계를 약간 개선하여 무기 이동 시 항력을 줄입니다.',
    stats: [],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%B0%A9%EC%96%B4%EA%B5%AC#%EC%A7%84%EC%A0%95%ED%95%9C%20%EC%9C%84%EC%9A%A9',
    checkedAt: '2026-11-01',
  },
  'armor-concussive-padding-grenadier': {
    summary: '폭발 피해 50% 저항. 투척무기 초기·최대 소지량 +2.',
    stats: [],
    traits: [],
    source: 'https://helldivers.wiki.gg/wiki/Armor_Passives',
    checkedAt: '2026-11-01',
  },
  'armor-concussive-padding-reinforced': {
    summary: '폭발 피해 50% 저항. 방어 등급 증가.',
    stats: [],
    traits: [],
    source: 'https://helldivers.wiki.gg/wiki/Concussive_Padding%2C_Reinforced',
    checkedAt: '2026-11-01',
  },
  'armor-supplemental-adrenaline': {
    summary: '착용자가 피해를 입으면 스태미나를 일부 회복합니다. 더 높은 장갑 등급을 제공합니다.',
    stats: [],
    traits: [],
    source:
      'https://www.namu.moe/w/HELLDIVERS%202/%EB%B0%A9%EC%96%B4%EA%B5%AC#%EB%B3%B4%EA%B8%89%20%EC%95%84%EB%93%9C%EB%A0%88%EB%82%A0%EB%A6%B0',
    checkedAt: '2026-11-01',
  },
};
