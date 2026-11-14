import { ImageResponse } from 'next/og';
import fs from 'node:fs/promises';
import path from 'node:path';
import { handAppearance, handArtworkSvg } from '../hand-artwork.mjs';
let font;
export async function renderGameResultImage(result) {
  font ||= fs.readFile(path.join(process.cwd(), 'public/fonts/HDGameResult.woff'));
  const hand = result.game === 'rps-hand';
  const appearance = handAppearance(result.handLevel);
  const accent = hand ? appearance.light : result.tone === 'lose' ? '#bcc9bb' : '#f6d65a';
  const date = new Date(result.completedAt).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#17231d',
        color: '#edf2ea',
        fontFamily: 'HDGameResult',
        padding: '44px 52px',
        borderTop: `10px solid ${accent}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: accent,
          fontSize: 22,
          letterSpacing: 2,
        }}
      >
        <span>HELLDIVERS 2 COMMUNITY</span>
        <span>{hand ? 'HAND ENHANCEMENT' : 'MISSION REPORT'}</span>
      </div>
      <div
        style={{
          display: 'flex',
          flex: 1,
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 28,
          ...(hand
            ? {
                flexDirection: 'row-reverse',
                border: `1px solid hsla(${appearance.hue},60%,70%,0.3)`,
                borderRadius: 18,
                background: `linear-gradient(115deg, hsla(${appearance.hue},40%,30%,0.25), #232c27)`,
                padding: 24,
                marginTop: 28,
                marginBottom: 4,
              }
            : {}),
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', width: hand ? 600 : 735 }}>
          <div style={{ display: 'flex', fontSize: 25, color: '#b5c1b5', marginBottom: 15 }}>
            {result.gameLabel}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 60,
              color: accent,
              lineHeight: 1.2,
              marginBottom: 18,
              ...(hand
                ? {
                    alignSelf: 'flex-start',
                    fontSize: 30,
                    padding: '6px 22px',
                    borderRadius: 40,
                    border: `1px solid ${accent}`,
                    background: `hsl(${appearance.hue},40%,20%)`,
                  }
                : {}),
            }}
          >
            {result.headline}
          </div>
          {hand && (
            <div style={{ display: 'flex', fontSize: 44, marginBottom: 22, lineHeight: 1.3 }}>
              {result.summary}
            </div>
          )}
          <div style={{ display: 'flex', fontSize: 28, color: hand ? '#b5c1b5' : '#edf2ea' }}>
            {result.nickname.slice(0, 24)} 대원
          </div>
          {!hand && (
            <div style={{ display: 'flex', fontSize: 22, color: '#b5c1b5', marginTop: 12 }}>
              {result.summary}
            </div>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            width: hand ? 360 : 280,
            height: hand ? 360 : 180,
            flexShrink: 0,
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            border: hand ? 'none' : `2px solid ${accent}`,
            borderRadius: 24,
            color: accent,
            fontSize: result.emblem.length > 8 ? 30 : 46,
            background: hand ? 'transparent' : '#25372a',
            position: 'relative',
          }}
        >
          {hand ? (
            <img
              src={`data:image/svg+xml;base64,${Buffer.from(handArtworkSvg(result.handLevel, { radiant: true })).toString('base64')}`}
              width={360}
              height={360}
            />
          ) : (
            result.emblem
          )}
        </div>
      </div>
      {!hand && (
        <div style={{ display: 'flex', gap: 14 }}>
          {result.stats.map(({ label, value }) => (
            <div
              key={label}
              style={{
                display: 'flex',
                flex: 1,
                flexDirection: 'column',
                padding: '18px 22px',
                border: '1px solid #425146',
                borderRadius: 12,
                background: '#202e25',
              }}
            >
              <span style={{ fontSize: 19, color: '#aabaaa', marginBottom: 8 }}>{label}</span>
              <span style={{ fontSize: 32 }}>{value}</span>
            </div>
          ))}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 17,
          color: '#9ba99e',
          marginTop: 24,
        }}
      >
        <span>FOR SUPER EARTH.</span>
        <span>{date} KST</span>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [{ name: 'HDGameResult', data: await font, weight: 600, style: 'normal' }],
    },
  );
}
