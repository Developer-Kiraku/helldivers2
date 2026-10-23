'use client';
import { mapFrameUrl, mapProviders, mapSearchUrl } from '@/lib/post-maps.mjs';
export default function PostMaps({ maps = [] }) {
  if (!maps.length) return null;
  return (
    <div className="post-maps">
      {maps.map((map, index) => (
        <figure className="post-map" key={`${index}-${map.provider}-${map.address}`}>
          <figcaption>
            <strong>
              {mapProviders[map.provider]} · {map.address}
            </strong>
            <a href={mapSearchUrl(map)} target="_blank" rel="noopener noreferrer">
              지도에서 보기 ↗
            </a>
          </figcaption>
          {!map.url && (
            <iframe
              src={mapFrameUrl(map)}
              title={`${mapProviders[map.provider]}: ${map.address}`}
              loading="lazy"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          )}
        </figure>
      ))}
    </div>
  );
}
