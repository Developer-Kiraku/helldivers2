import Link from 'next/link';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import EquipmentDetails from './EquipmentDetails';

function Medal({ count }) {
  return (
    <span className="warbond-medals">
      <img src="/warbonds/medal.webp" alt="메달" width="14" height="19" />
      {count.toLocaleString('ko-KR')}
    </span>
  );
}
export default function WarbondDetail({ warbond, pageNumber }) {
  const page = warbond.pages[pageNumber - 1];
  const base = `/warbonds/${warbond.slug}`;
  return (
    <div className="warbond-library warbond-detail">
      <Link className="warbond-back" href="/warbonds">
        <ArrowLeft size={16} aria-hidden="true" />
        전쟁 채권 사전
      </Link>
      <header className="warbond-hero">
        <div className="warbond-hero-art">
          <img src={warbond.src} alt={`${warbond.label} 채권 표지`} width="640" height="320" />
        </div>
        <div className="warbond-hero-copy">
          <span className={`warbond-badge is-${warbond.type}`}>{warbond.typeLabel}</span>
          <h1>{warbond.label}</h1>
          <p>{warbond.name}</p>
          <dl className="warbond-facts">
            <div>
              <dt>채권 가격</dt>
              <dd>
                {warbond.price ? (
                  <>
                    <img
                      src="/warbonds/super-credits.webp"
                      alt="슈퍼 크레딧"
                      width="22"
                      height="22"
                    />
                    {warbond.price.toLocaleString('ko-KR')}
                  </>
                ) : (
                  '기본 제공'
                )}
              </dd>
            </div>
            <div>
              <dt>전체 보상</dt>
              <dd>
                {warbond.rewardCount}
                <small>개</small>
              </dd>
            </div>
            <div>
              <dt>필요 메달</dt>
              <dd>
                <Medal count={warbond.totalMedals} />
              </dd>
            </div>
            <div>
              <dt>획득 크레딧</dt>
              <dd>
                {warbond.credits.toLocaleString('ko-KR')}
                <small>SC</small>
              </dd>
            </div>
          </dl>
        </div>
      </header>
      <nav className="warbond-pages" aria-label="채권 페이지">
        {warbond.pages.map((entry) => (
          <Link
            key={entry.number}
            href={`${base}?page=${entry.number}`}
            scroll={false}
            aria-current={entry.number === pageNumber ? 'page' : undefined}
          >
            <span>{String(entry.number).padStart(2, '0')}</span>페이지
          </Link>
        ))}
      </nav>
      <section className="warbond-page-content" aria-labelledby="warbond-page-title">
        <header className="warbond-page-heading">
          <div>
            <span className="warbond-eyebrow">PAGE {String(pageNumber).padStart(2, '0')}</span>
            <h2 id="warbond-page-title">
              {pageNumber}페이지 보상 <span>{page.items.length}개</span>
            </h2>
          </div>
          <span className="warbond-page-cost">
            이 페이지 <Medal count={page.items.reduce((sum, item) => sum + item.medals, 0)} />
          </span>
        </header>
        <div className="warbond-rewards">
          {page.items.map((item) => (
            <article className={`warbond-reward is-${item.kind}`} key={item.id}>
              <div className="warbond-reward-top">
                <span>{item.armorClass || item.typeLabel}</span>
                <Medal count={item.medals} />
              </div>
              <div className="warbond-reward-art">
                <img src={item.src} alt={item.label} width="320" height="240" loading="lazy" />
              </div>
              <div className="warbond-reward-copy">
                <h3>{item.label}</h3>
                {item.passive && (
                  <span className="warbond-passive">
                    <img src={item.passive.src} alt="" width="18" height="18" />
                    {item.passive.label}
                  </span>
                )}
              </div>
              {item.detailsId && <EquipmentDetails id={item.detailsId} cardLabel={item.label} />}
            </article>
          ))}
        </div>
      </section>
      <nav className="warbond-page-bottom" aria-label="이전 및 다음 페이지">
        {pageNumber > 1 ? (
          <Link href={`${base}?page=${pageNumber - 1}`} scroll={false}>
            <ChevronLeft size={18} />
            이전 페이지
          </Link>
        ) : (
          <span />
        )}
        <span>
          {pageNumber} / {warbond.pages.length}
        </span>
        {pageNumber < warbond.pages.length ? (
          <Link href={`${base}?page=${pageNumber + 1}`} scroll={false}>
            다음 페이지
            <ChevronRight size={18} />
          </Link>
        ) : (
          <Link href="/warbonds">
            채권 목록
            <ArrowRight size={18} />
          </Link>
        )}
      </nav>
    </div>
  );
}
