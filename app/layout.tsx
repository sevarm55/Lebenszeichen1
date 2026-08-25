import type { Metadata, Viewport } from 'next'
import { Inter, Newsreader } from 'next/font/google'

import './globals.css'
import { siteConfig } from '@/config/site'

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-inter',
})

const newsreader = Newsreader({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
})

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  formatDetection: { telephone: false, date: false, address: false, email: false },
}

export const viewport: Viewport = {
  themeColor: '#fbfaf7',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${inter.variable} ${newsreader.variable}`}>
      <head>
        {/*
          Google Consent Mode v2 defaults.

          Inlined in the document head on purpose: this must execute before any
          Google tag loads, otherwise the first AdSense/GA call fires in the
          granted state and is only corrected afterwards — which is exactly what
          the GDPR consent requirement forbids. `next/script` cannot guarantee
          that ordering from a nested layout.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',functionality_storage:'granted',security_storage:'granted',wait_for_update:2000});
gtag('set','ads_data_redaction',true);gtag('set','url_passthrough',true);
window.__lzConsent=window.__lzConsent||{analytics:false,ads:false};`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
