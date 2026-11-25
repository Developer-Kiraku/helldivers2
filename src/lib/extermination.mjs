export const trainingDuration = 25000;
export const trainingMaxStage = 20;
export const trainingEnemies = [
  { id: 'scavenger', name: '스캐빈저', hp: 1, attack: 4, reward: 20, size: 135, exposure: 1 },
  { id: 'warrior', name: '워리어', hp: 2, attack: 6, reward: 30, size: 145, exposure: 1.4 },
  { id: 'hunter', name: '헌터', hp: 1, attack: 5, reward: 40, size: 135, exposure: 0.72 },
  { id: 'spewer', name: '바일 스퓨어', hp: 3, attack: 9, reward: 60, size: 160, exposure: 2 },
  { id: 'charger', name: '차저', hp: 4, attack: 12, reward: 120, size: 170, exposure: 2.8 },
  { id: 'titan', name: '바일 타이탄', hp: 5, attack: 16, reward: 240, size: 195, exposure: 3.8 },
  {
    id: 'dragonroach',
    name: '드래곤 로치',
    hp: 5,
    attack: 14,
    reward: 200,
    size: 205,
    exposure: 3.4,
  },
];
export function trainingStage(stage) {
  const index = Math.max(0, Math.min(19, stage - 1));
  return {
    exposure: [
      2600, 2450, 2300, 2150, 2000, 1850, 1700, 1550, 1400, 1250, 1180, 1120, 1060, 1000, 950, 900,
      850, 800, 750, 700,
    ][index],
    interval: Math.max(740, 1000 - index * 16),
    goal: 12 + Math.min(8, Math.floor(index / 2)),
    multiplier: 1 + index * 0.05,
  };
}
export function trainingSpread(level, heat = 0) {
  const values = [40, 30, 21.667, 15, 10];
  const limits = [66.667, 53.333, 40, 30, 20];
  const clamped = Math.max(0, Math.min(20, level));
  const tier = Math.min(3, Math.floor(clamped / 5));
  const fraction = (clamped - tier * 5) / 5;
  const base = values[tier] + (values[tier + 1] - values[tier]) * fraction;
  const maximum = limits[tier] + (limits[tier + 1] - limits[tier]) * fraction;
  return base + (maximum - base) * Math.max(0, Math.min(1, heat));
}
function random(run) {
  let value = run.randomState | 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  run.randomState = value >>> 0;
  return run.randomState / 4294967296;
}
export function createTrainingRun({ id, userId, seed, handLevel = 0, now = Date.now() }) {
  return {
    id,
    userId,
    version: 2,
    seed,
    randomState: seed || 1,
    handLevel,
    issuedAt: new Date(now).toISOString(),
    status: 'playing',
    stage: 1,
    hp: 50,
    clock: 0,
    lastTime: 0,
    stageStart: 0,
    nextSpawn: 400,
    spawnCount: 0,
    sequence: 0,
    enemies: [],
    kills: 0,
    totalKills: 0,
    shots: 0,
    hits: 0,
    ammo: 12,
    reloadAt: 0,
    heat: 0,
    lastShot: -10000,
    points: 0,
    stagePoints: 0,
    counts: Array(7).fill(0),
    income: Array(7).fill(0),
    clearedStages: 0,
    lastImpact: null,
    lastAttack: null,
  };
}
export function trainingEnemyPosition(enemy, clock) {
  const age = Math.max(0, clock - enemy.born) / 1000;
  if (enemy.motionVersion === 2) {
    const amplitude = [48, 42, 78, 34, 38, 28, 64][enemy.kind];
    const speed = [3.2, 2.8, 4.4, 2.5, 3, 2, 3.6][enemy.kind];
    return {
      x: enemy.x + Math.sin(age * speed + enemy.phase) * amplitude,
      y: enemy.y + Math.sin(age * speed * 0.73 + enemy.phase) * amplitude * 0.55,
    };
  }
  const amplitude = enemy.kind === 2 ? 32 : enemy.kind === 6 ? 26 : 14;
  return {
    x: enemy.x + Math.sin(age * 2.1 + enemy.phase) * amplitude,
    y: enemy.y + Math.sin(age * 1.5 + enemy.phase) * amplitude * 0.55,
  };
}
function spawn(run) {
  if (run.enemies.length >= (run.stage < 10 ? 3 : 4)) return;
  const weights =
    run.stage <= 2
      ? [0.6, 0.25, 0.15, 0, 0, 0, 0]
      : run.stage <= 4
        ? [0.4, 0.25, 0.25, 0.1, 0, 0, 0]
        : run.stage <= 9
          ? [0.24, 0.23, 0.25, 0.2, 0.08, 0, 0]
          : run.stage <= 14
            ? [0.16, 0.18, 0.24, 0.22, 0.13, 0.07, 0]
            : [0.13, 0.16, 0.22, 0.2, 0.13, 0.09, 0.07];
  const roll = random(run);
  let kind = 0,
    accumulated = weights[0];
  while (kind < 6 && roll >= accumulated) accumulated += weights[++kind];
  if (run.stage >= 15 && run.spawnCount % 10 === 0) kind = 6;
  else if (run.stage >= 10 && run.spawnCount % 8 === 0) kind = 5;
  const slots = Array.from({ length: 9 }, (_, index) => index).filter(
    (slot) => !run.enemies.some((enemy) => enemy.slot === slot),
  );
  const slot = slots[Math.floor(random(run) * slots.length)];
  const type = trainingEnemies[kind];
  run.enemies.push({
    id: ++run.spawnCount,
    kind,
    motionVersion: run.version,
    slot,
    hp: type.hp,
    born: run.clock,
    expires:
      run.clock +
      Math.max(kind === 2 ? 600 : 0, Math.round(trainingStage(run.stage).exposure * type.exposure)),
    x: 175 + (slot % 3) * 325 + (random(run) - 0.5) * 20,
    y: 140 + Math.floor(slot / 3) * 180 + (random(run) - 0.5) * 20,
    phase: random(run) * Math.PI * 2,
  });
}
function endRun(run, reason) {
  run.status = 'finished';
  run.reason = reason;
  run.enemies = [];
}
export function advanceTraining(run, time) {
  if (!Number.isFinite(time) || time < run.lastTime) throw Error('게임 시간 순서를 확인해주세요.');
  const target = run.clock + (time - run.lastTime);
  run.lastTime = time;
  if (run.status !== 'playing') return run;
  while (run.status === 'playing' && run.clock < target) {
    const stageEnd = run.stageStart + trainingDuration;
    const next = Math.min(
      target,
      run.nextSpawn,
      stageEnd,
      ...run.enemies.map((enemy) => enemy.expires),
    );
    run.clock = next;
    if (run.reloadAt && run.clock >= run.reloadAt) {
      run.ammo = 12;
      run.reloadAt = 0;
    }
    const expired = run.enemies.filter((enemy) => enemy.expires <= run.clock);
    for (const enemy of expired) {
      run.hp = Math.max(0, run.hp - trainingEnemies[enemy.kind].attack);
      run.lastAttack = {
        ...enemy,
        at: run.clock,
        wallTime: time - (target - run.clock),
        damage: trainingEnemies[enemy.kind].attack,
      };
      run.enemies = run.enemies.filter((row) => row.id !== enemy.id);
      if (!run.hp) {
        endRun(run, 'hp');
        break;
      }
    }
    if (run.status !== 'playing') break;
    if (run.clock >= stageEnd) {
      endRun(run, 'timeout');
      break;
    }
    if (run.clock >= run.nextSpawn) {
      spawn(run);
      run.nextSpawn = run.clock + trainingStage(run.stage).interval * (0.9 + random(run) * 0.2);
    }
  }
  if (run.reloadAt && run.clock >= run.reloadAt) {
    run.ammo = 12;
    run.reloadAt = 0;
  }
  return run;
}
export function applyTrainingEvent(run, event) {
  advanceTraining(run, event.t);
  if (run.status === 'finished') return run;
  if (event.type === 'stop') {
    endRun(run, 'stopped');
    return run;
  }
  if (event.type === 'pause' && run.status === 'playing') {
    run.status = 'paused';
    return run;
  }
  if (event.type === 'resume' && run.status === 'paused') {
    run.status = 'playing';
    return run;
  }
  if (event.type === 'next' && run.status === 'cleared') {
    run.stage++;
    run.hp = Math.min(50, run.hp + 5);
    run.kills = 0;
    run.stagePoints = 0;
    run.ammo = 12;
    run.reloadAt = 0;
    run.stageStart = run.clock;
    run.nextSpawn = run.clock + 400;
    run.spawnCount = 0;
    run.heat = 0;
    run.lastShot = run.clock - 10000;
    run.status = 'playing';
    return run;
  }
  if (event.type !== 'shot' || run.status !== 'playing' || run.reloadAt) return run;
  run.shots++;
  run.ammo--;
  const heat = Math.max(0, run.heat - (run.clock - run.lastShot) / 600);
  const radius = trainingSpread(run.handLevel, heat);
  run.heat = Math.min(1, heat + 0.4);
  run.lastShot = run.clock;
  const angle = random(run) * Math.PI * 2,
    distance = Math.sqrt(random(run)) * radius;
  const x = event.x + Math.cos(angle) * distance,
    y = event.y + Math.sin(angle) * distance;
  const enemy = run.enemies.find((row) => {
    const position = trainingEnemyPosition(row, run.clock),
      size = trainingEnemies[row.kind].size;
    return ((x - position.x) / (size * 0.34)) ** 2 + ((y - position.y) / (size * 0.38)) ** 2 <= 1;
  });
  run.lastImpact = { id: run.shots, x, y, at: run.clock, wallTime: event.t, hit: Boolean(enemy) };
  if (enemy) {
    run.hits++;
    enemy.hp--;
    enemy.hitAt = run.clock;
    run.lastImpact.enemy = enemy.id;
    run.lastImpact.kind = enemy.kind;
    run.lastImpact.position = trainingEnemyPosition(enemy, run.clock);
    if (!enemy.hp) {
      const reward = Math.max(
        1,
        Math.floor(trainingEnemies[enemy.kind].reward * trainingStage(run.stage).multiplier * 0.26),
      );
      run.points += reward;
      run.stagePoints += reward;
      run.totalKills++;
      run.kills++;
      run.counts[enemy.kind]++;
      run.income[enemy.kind] += reward;
      run.enemies = run.enemies.filter((row) => row.id !== enemy.id);
      run.lastImpact.reward = reward;
      if (run.kills >= trainingStage(run.stage).goal) {
        run.clearedStages = run.stage;
        run.enemies = [];
        if (run.stage === trainingMaxStage) endRun(run, 'completed');
        else run.status = 'cleared';
      }
    }
  }
  if (!run.ammo) run.reloadAt = run.clock + 850;
  return run;
}
