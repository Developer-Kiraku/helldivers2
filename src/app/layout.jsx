import '@radix-ui/themes/styles.css';
import './globals.scss';
import './ui.scss';
import { UIProvider } from '@/components/ui';
import { CommunityProvider } from '@/components/CommunityProvider';
import Shell from '@/components/Shell';
import { getCurrentUser } from '@/lib/server/auth';
import { site } from '@/lib/site.mjs';

export const metadata = {
  title: { default: site.title, template: `%s | ${site.title}` },
  description: site.description,
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: site.title,
    title: site.title,
    description: site.description,
    images: [
      {
        url: new URL(site.image, site.url).href,
        width: site.imageWidth,
        height: site.imageHeight,
        alt: site.imageAlt,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: site.title,
    description: site.description,
    images: [{ url: new URL(site.image, site.url).href, alt: site.imageAlt }],
  },
};

export default async function RootLayout({ children }) {
  const initialUser = await getCurrentUser();
  return (
    <html lang="ko">
      <body>
        <UIProvider>
          <CommunityProvider initialUser={initialUser}>
            <Shell>{children}</Shell>
          </CommunityProvider>
        </UIProvider>
      </body>
    </html>
  );
}
