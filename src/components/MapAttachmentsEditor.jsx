'use client';
import { useEffect, useRef, useState } from 'react';
import { useCommunity } from './CommunityProvider';
import { Button, Input, Label, Select } from './ui';
import Modal from './Modal';
import Icon from './Icon';
import PostMaps from './PostMaps';
import { mapLimit, normalizeMaps, googleEmbedUrl, mapSearchUrl } from '@/lib/post-maps.mjs';
export default function MapAttachmentsEditor({ value = [], onChange, disabled = false }) {
  const { api } = useCommunity();
  const [open, setOpen] = useState(false),
    [provider, setProvider] = useState('kakao'),
    [address, setAddress] = useState(''),
    [embed, setEmbed] = useState('');
  const [results, setResults] = useState([]),
    [candidate, setCandidate] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [settings, setSettings] = useState(null);
  const sequence = useRef(0);
  useEffect(() => {
    if (!open) return;
    let active = true;
    api('integrations/maps')
      .then((data) => {
        if (active) setSettings(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
      sequence.current++;
    };
  }, [api, open]);
  function reset() {
    sequence.current++;
    setResults([]);
    setCandidate(null);
    setError('');
    setBusy(false);
  }
  async function search() {
    const attempt = ++sequence.current;
    setError('');
    setResults([]);
    setCandidate(null);
    if (provider === 'kakao' && /^https?:\/\//i.test(address.trim())) {
      setError('링크 대신 도로명·지번 주소 또는 장소명을 입력해주세요.');
      return;
    }
    if (address.trim().length < 2 || address.trim().length > 300) {
      setError('주소 또는 장소명을 2~300자로 입력해주세요.');
      return;
    }
    if (provider === 'google') {
      try {
        const map = { provider, address: address.trim() };
        if (embed.trim()) {
          map.embedUrl = googleEmbedUrl(embed);
          if (!map.embedUrl)
            throw Error('Google 지도에서 복사한 지도 퍼가기 HTML 또는 삽입 주소를 입력해주세요.');
        }
        if (!settings?.googleConfigured && !map.embedUrl)
          throw Error(
            '구글맵 자동 삽입 키가 아직 없습니다. 아래의 지도 퍼가기 주소를 입력하면 키 없이 첨부할 수 있습니다.',
          );
        setCandidate(normalizeMaps([map])[0]);
      } catch (e) {
        setError(e.message);
      }
      return;
    }
    setBusy(true);
    try {
      const data = await api(`maps/search?q=${encodeURIComponent(address.trim())}`);
      if (sequence.current !== attempt) return;
      setResults(data.results);
      if (data.results.length === 1) setCandidate(normalizeMaps(data.results)[0]);
      if (!data.results.length)
        setError('검색 결과가 없습니다. 도로명 주소나 다른 장소명으로 검색해주세요.');
    } catch (e) {
      if (sequence.current === attempt) setError(e.message);
    } finally {
      if (sequence.current === attempt) setBusy(false);
    }
  }
  return (
    <section className="map-attachments-editor">
      <header>
        <Label>
          지도 · {value.length}/{mapLimit}
        </Label>
        <Button
          type="button"
          disabled={disabled || value.length >= mapLimit}
          onClick={() => {
            reset();
            setOpen(true);
          }}
        >
          <Icon name="map" size={17} />
          지도 첨부
        </Button>
      </header>
      {value.map((map, index) => (
        <div className="attached-map" key={`${index}-${map.address}`}>
          <span>
            {map.provider === 'kakao' ? '카카오맵' : '구글맵'} · {map.address}
          </span>
          <Button
            type="button"
            disabled={disabled}
            aria-label={`${map.address} 지도 삭제`}
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          >
            <Icon name="delete" size={16} />
            삭제
          </Button>
        </div>
      ))}
      {value.length > 0 && <PostMaps maps={value} />}
      {open && (
        <Modal title="지도 첨부" onClose={() => setOpen(false)} className="map-picker-modal">
          <div className="map-picker-fields">
            <Label htmlFor="map-provider">지도 선택</Label>
            <Select
              id="map-provider"
              value={provider}
              onChange={(e) => {
                reset();
                setProvider(e.target.value);
              }}
            >
              <option value="kakao">카카오맵</option>
              <option value="google">구글맵</option>
            </Select>
            <Label htmlFor="map-address">주소 또는 장소명</Label>
            <Input
              id="map-address"
              value={address}
              maxLength={300}
              placeholder="예: 서울특별시 중구 세종대로 110"
              onChange={(e) => {
                reset();
                setAddress(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void search();
                }
              }}
            />
            {provider === 'kakao' && (
              <p>
                도로명·지번 주소 또는 장소명을 검색하세요. 위치를 확인한 뒤 첨부하면 게시글 안에
                카카오맵 지도와 위치 핀이 표시됩니다.
              </p>
            )}
            {provider === 'google' && (
              <details open={!settings?.googleConfigured}>
                <summary>Google 지도 퍼가기 주소 (선택)</summary>
                <p>Google 지도에서 ‘공유 → 지도 퍼가기 → HTML 복사’를 선택한 뒤 붙여 넣으세요.</p>
                <Input
                  aria-label="Google 지도 퍼가기 HTML 또는 주소"
                  value={embed}
                  maxLength={14000}
                  onChange={(e) => {
                    reset();
                    setEmbed(e.target.value);
                  }}
                />
                <a
                  href={mapSearchUrl({ provider: 'google', address: address.trim() })}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google 지도에서 위치 찾기 ↗
                </a>
              </details>
            )}
            <Button type="button" disabled={busy} onClick={search}>
              {busy ? '검색 중…' : provider === 'kakao' ? '주소 검색' : '지도 미리보기'}
            </Button>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {results.length > 0 && (
            <ul className="map-search-results" aria-label="주소 검색 결과">
              {results.map((map, index) => (
                <li key={index}>
                  <Button
                    type="button"
                    aria-pressed={candidate?.lat === map.lat && candidate?.lng === map.lng}
                    onClick={() => {
                      setCandidate(normalizeMaps([map])[0]);
                      setError('');
                    }}
                  >
                    <strong>{map.name}</strong>
                    <span>{map.address}</span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {candidate && <PostMaps maps={[candidate]} />}
          <Button
            type="button"
            disabled={!candidate || busy}
            onClick={() => {
              if (value.length >= mapLimit) return;
              onChange([...value, candidate]);
              setOpen(false);
            }}
          >
            선택한 지도 첨부
          </Button>
        </Modal>
      )}
    </section>
  );
}
