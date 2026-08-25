'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AlertTriangle, Check, ExternalLink } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { apiFetch } from '@/lib/admin-client'
import { AD_DENSITY_PRESETS, type AdDensity } from '@/server/ads/engine'
import { cn } from '@/lib/utils'

interface Settings {
  siteName: string
  tagline: string
  description: string
  logoUrl: string | null
  postsPerPage: number
  defaultAuthorId: string | null
  seoTitlePattern: string
  organizationName: string
  adsEnabled: boolean
  adsDensity: string
  adsSidebarEnabled: boolean
  adsMobileStickyOn: boolean
  adsMinWordsForInline: number
  adsMaxInContent: number
  adsMinWordsBetween: number
  analyticsProvider: string
  cmpProvider: string
  legalCompanyName: string
  legalAddress: string
  legalEmail: string
  legalPhone: string
  legalVatId: string
  legalManagingDir: string
}

interface Placement {
  key: string
  label: string
  description: string
  device: string
  enabled: boolean
  networkSlot: string
  envSlot: string
}

interface Integrations {
  siteUrl: string
  adsMasterSwitch: boolean
  adsenseClientId: string
  adsenseAutoAds: boolean
  cmpEnvProvider: string
  analyticsEnvProvider: string
  ga4Id: string
  popunderEnabled: boolean
  aiProvider: string
  aiProviderLabel: string
  aiReady: boolean
  aiReadyHint: string
  aiTextModel: string
  aiImageModel: string
  storageDriver: string
}

type Tab = 'general' | 'publishing' | 'seo' | 'ads' | 'legal' | 'integrations'

const DENSITY_LABELS: Record<AdDensity, string> = {
  low: 'Низкая — чтение важнее',
  balanced: 'Сбалансированная (рекомендуется)',
  high: 'Высокая — больше показов',
  aggressive: 'Максимальная — предел политики AdSense',
}

export function SettingsForm({
  settings: initial,
  placements: initialPlacements,
  authors,
  integrations,
}: {
  settings: Settings
  placements: Placement[]
  authors: { id: string; name: string }[]
  integrations: Integrations
}) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('general')
  const [settings, setSettings] = useState(initial)
  const [placements, setPlacements] = useState(initialPlacements)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const patch = (changes: Partial<Settings>) => setSettings({ ...settings, ...changes })

  const save = async () => {
    setBusy(true)
    setError('')
    setSaved(false)
    try {
      await apiFetch('/api/admin/settings', {
        method: 'PUT',
        json: {
          ...settings,
          logoUrl: settings.logoUrl || null,
          defaultAuthorId: settings.defaultAuthorId || null,
          placements: placements.map((p) => ({
            key: p.key,
            enabled: p.enabled,
            networkSlot: p.networkSlot,
          })),
        },
      })
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить настройки.')
    }
    setBusy(false)
  }

  const tabs: [Tab, string][] = [
    ['general', 'Общие'],
    ['publishing', 'Публикация'],
    ['seo', 'SEO'],
    ['ads', 'Реклама'],
    ['legal', 'Рекизиты'],
    ['integrations', 'Интеграции'],
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b border-[var(--color-border)]">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm transition-colors',
              tab === id
                ? 'border-[var(--color-accent)] font-medium text-[var(--color-accent)]'
                : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        {tab === 'general' && (
          <div className="max-w-2xl space-y-4">
            <Field label="Название сайта (SITE_NAME)" htmlFor="siteName">
              <Input
                id="siteName"
                value={settings.siteName}
                onChange={(e) => patch({ siteName: e.target.value })}
              />
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                Временный плейсхолдер. Меняется здесь и в переменной SITE_NAME — больше нигде
                название не зашито.
              </p>
            </Field>
            <Field label="Слоган" htmlFor="tagline">
              <Input
                id="tagline"
                value={settings.tagline}
                onChange={(e) => patch({ tagline: e.target.value })}
              />
            </Field>
            <Field label="Описание сайта" htmlFor="description">
              <Textarea
                id="description"
                value={settings.description}
                onChange={(e) => patch({ description: e.target.value })}
                rows={3}
              />
            </Field>
            <Field label="Логотип (URL)" htmlFor="logoUrl">
              <Input
                id="logoUrl"
                value={settings.logoUrl ?? ''}
                onChange={(e) => patch({ logoUrl: e.target.value })}
                placeholder="/uploads/logo.webp"
              />
            </Field>
            <Field label="Домен">
              <Input value={integrations.siteUrl} disabled />
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                Задаётся переменной NEXT_PUBLIC_SITE_URL при деплое.
              </p>
            </Field>
          </div>
        )}

        {tab === 'publishing' && (
          <div className="max-w-2xl space-y-4">
            <Field label="Материалов на странице" htmlFor="perPage">
              <Input
                id="perPage"
                type="number"
                min={4}
                max={48}
                value={settings.postsPerPage}
                onChange={(e) => patch({ postsPerPage: Number(e.target.value) || 12 })}
                className="w-28"
              />
            </Field>
            <Field label="Автор по умолчанию" htmlFor="defaultAuthor">
              <select
                id="defaultAuthor"
                value={settings.defaultAuthorId ?? ''}
                onChange={(e) => patch({ defaultAuthorId: e.target.value })}
                className="h-9 w-full max-w-sm rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 text-sm"
              >
                <option value="">— не задан —</option>
                {authors.map((author) => (
                  <option key={author.id} value={author.id}>
                    {author.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 py-2 text-xs text-[var(--color-muted)]">
              Часовой пояс публикаций: Europe/Berlin. Изменяется в переменных окружения.
            </div>
          </div>
        )}

        {tab === 'seo' && (
          <div className="max-w-2xl space-y-4">
            <Field label="Шаблон SEO-заголовка" htmlFor="seoPattern">
              <Input
                id="seoPattern"
                value={settings.seoTitlePattern}
                onChange={(e) => patch({ seoTitlePattern: e.target.value })}
              />
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                <code>%s</code> — заголовок материала, <code>{'{siteName}'}</code> — название сайта.
              </p>
            </Field>
            <Field label="Название организации (schema.org)" htmlFor="orgName">
              <Input
                id="orgName"
                value={settings.organizationName}
                onChange={(e) => patch({ organizationName: e.target.value })}
              />
            </Field>
            <div className="space-y-1.5 rounded-sm border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-muted)]">
              <p>Автоматически формируются:</p>
              <ul className="list-disc space-y-0.5 pl-4">
                <li>sitemap.xml — все опубликованные материалы и рубрики</li>
                <li>robots.txt — /admin, /api и /suche закрыты от индексации</li>
                <li>JSON-LD: Organization, WebSite, Article, BreadcrumbList</li>
                <li>301-редиректы при смене адреса материала или рубрики</li>
              </ul>
            </div>
          </div>
        )}

        {tab === 'ads' && (
          <div className="space-y-5">
            {!integrations.adsMasterSwitch && (
              <p className="flex items-start gap-2 rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Главный выключатель <code>ADS_ENABLED</code> в переменных окружения выключен —
                реклама не будет показана, даже если включить её здесь.
              </p>
            )}
            {!integrations.adsenseClientId && (
              <p className="flex items-start gap-2 rounded-sm border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  ID издателя AdSense (<code>NEXT_PUBLIC_ADSENSE_CLIENT_ID</code>) не задан. До этого
                  момента рекламные места отображаются только в предпросмотре — читатели их не видят.
                </span>
              </p>
            )}

            <div className="max-w-2xl space-y-4">
              <label className="flex items-center justify-between gap-4 rounded-sm border border-[var(--color-border)] px-3 py-2.5">
                <span>
                  <span className="block text-sm font-medium">Показывать рекламу</span>
                  <span className="block text-xs text-[var(--color-muted)]">
                    Работает только вместе с ADS_ENABLED и ID издателя.
                  </span>
                </span>
                <Switch
                  checked={settings.adsEnabled}
                  onCheckedChange={(v) => patch({ adsEnabled: v })}
                />
              </label>

              <Field label="Плотность рекламы в статье" htmlFor="density">
                <select
                  id="density"
                  value={settings.adsDensity}
                  onChange={(e) => {
                    const density = e.target.value as AdDensity
                    const preset = AD_DENSITY_PRESETS[density]
                    patch({
                      adsDensity: density,
                      adsMinWordsForInline: preset.minWordsForInline,
                      adsMinWordsBetween: preset.minWordsBetween,
                      adsMaxInContent: preset.maxInContent,
                    })
                  }}
                  className="h-9 w-full max-w-md rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 text-sm"
                >
                  {(Object.keys(AD_DENSITY_PRESETS) as AdDensity[]).map((density) => (
                    <option key={density} value={density}>
                      {DENSITY_LABELS[density]}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  Количество блоков в статье вычисляется из её длины — короткий материал никогда не
                  получит столько же рекламы, сколько длинный.
                </p>
              </Field>

              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Мин. слов для вставок" htmlFor="minWords">
                  <Input
                    id="minWords"
                    type="number"
                    min={50}
                    max={2000}
                    value={settings.adsMinWordsForInline}
                    onChange={(e) => patch({ adsMinWordsForInline: Number(e.target.value) || 180 })}
                  />
                </Field>
                <Field label="Мин. слов между блоками" htmlFor="between">
                  <Input
                    id="between"
                    type="number"
                    min={80}
                    max={2000}
                    value={settings.adsMinWordsBetween}
                    onChange={(e) => patch({ adsMinWordsBetween: Number(e.target.value) || 140 })}
                  />
                </Field>
                <Field label="Максимум блоков в тексте" htmlFor="maxIn">
                  <Input
                    id="maxIn"
                    type="number"
                    min={0}
                    max={12}
                    value={settings.adsMaxInContent}
                    onChange={(e) => patch({ adsMaxInContent: Number(e.target.value) || 0 })}
                  />
                </Field>
              </div>

              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={settings.adsSidebarEnabled}
                    onCheckedChange={(v) => patch({ adsSidebarEnabled: v })}
                  />
                  Реклама в сайдбаре (десктоп)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={settings.adsMobileStickyOn}
                    onCheckedChange={(v) => patch({ adsMobileStickyOn: v })}
                  />
                  Липкий блок внизу (мобильные)
                </label>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold">Рекламные места</h3>
              <div className="overflow-x-auto rounded border border-[var(--color-border)]">
                <table className="w-full min-w-[42rem] text-sm">
                  <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)] text-left">
                    <tr className="text-xs uppercase tracking-wider text-[var(--color-muted)]">
                      <th className="px-3 py-2 font-medium">Место</th>
                      <th className="px-3 py-2 font-medium">Устройство</th>
                      <th className="px-3 py-2 font-medium">ID блока</th>
                      <th className="w-20 px-3 py-2 font-medium">Вкл.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {placements.map((placement, index) => (
                      <tr key={placement.key}>
                        <td className="px-3 py-2">
                          <p className="font-medium">{placement.label}</p>
                          <p className="text-xs text-[var(--color-muted)]">{placement.description}</p>
                        </td>
                        <td className="px-3 py-2 text-xs text-[var(--color-muted)]">
                          {placement.device === 'desktop'
                            ? 'десктоп'
                            : placement.device === 'mobile'
                              ? 'мобильные'
                              : 'все'}
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            value={placement.networkSlot}
                            placeholder={placement.envSlot || 'из .env'}
                            onChange={(e) => {
                              const next = [...placements]
                              next[index] = { ...placement, networkSlot: e.target.value }
                              setPlacements(next)
                            }}
                            className="h-8 w-36 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Switch
                            checked={placement.enabled}
                            onCheckedChange={(v) => {
                              const next = [...placements]
                              next[index] = { ...placement, enabled: v }
                              setPlacements(next)
                            }}
                            aria-label={placement.label}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-[var(--color-muted)]">
                Если поле «ID блока» пустое, берётся значение из переменных окружения
                (NEXT_PUBLIC_AD_SLOT_*).
              </p>
            </div>
          </div>
        )}

        {tab === 'legal' && (
          <div className="max-w-2xl space-y-4">
            <p className="rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Эти данные обязательны по немецкому праву (§ 5 DDG). Без них сайт нельзя публиковать —
              и AdSense не одобрит заявку.
            </p>
            <Field label="Название компании / ФИО" htmlFor="legalName">
              <Input
                id="legalName"
                value={settings.legalCompanyName}
                onChange={(e) => patch({ legalCompanyName: e.target.value })}
              />
            </Field>
            <Field label="Ответственное лицо" htmlFor="legalDir">
              <Input
                id="legalDir"
                value={settings.legalManagingDir}
                onChange={(e) => patch({ legalManagingDir: e.target.value })}
              />
            </Field>
            <Field label="Адрес" htmlFor="legalAddr">
              <Textarea
                id="legalAddr"
                value={settings.legalAddress}
                onChange={(e) => patch({ legalAddress: e.target.value })}
                rows={2}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="E-mail" htmlFor="legalEmail">
                <Input
                  id="legalEmail"
                  value={settings.legalEmail}
                  onChange={(e) => patch({ legalEmail: e.target.value })}
                />
              </Field>
              <Field label="Телефон" htmlFor="legalPhone">
                <Input
                  id="legalPhone"
                  value={settings.legalPhone}
                  onChange={(e) => patch({ legalPhone: e.target.value })}
                />
              </Field>
            </div>
            <Field label="USt-IdNr." htmlFor="legalVat">
              <Input
                id="legalVat"
                value={settings.legalVatId}
                onChange={(e) => patch({ legalVatId: e.target.value })}
              />
            </Field>
          </div>
        )}

        {tab === 'integrations' && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--color-muted)]">
              Ключи задаются только в файле <code>.env</code> на сервере и никогда не передаются в
              браузер. Здесь показано текущее состояние.
            </p>

            <IntegrationRow
              name="AI-провайдер"
              status={integrations.aiReady ? 'ok' : 'warn'}
              value={`${integrations.aiProviderLabel} · ${integrations.aiTextModel}`}
              hint={
                integrations.aiReady
                  ? `Изображения: ${integrations.aiImageModel}`
                  : integrations.aiReadyHint
              }
              envVars={['AI_PROVIDER', 'FAL_KEY', 'AI_TEXT_MODEL', 'AI_IMAGE_MODEL']}
            />

            <IntegrationRow
              name="Google AdSense"
              status={integrations.adsenseClientId ? 'ok' : 'off'}
              value={integrations.adsenseClientId || 'не подключён'}
              hint={
                integrations.adsenseAutoAds
                  ? 'Auto Ads включены — Google добавит якорные и полноэкранные форматы.'
                  : 'Auto Ads выключены — показываются только наши места.'
              }
              envVars={['ADS_ENABLED', 'NEXT_PUBLIC_ADSENSE_CLIENT_ID', 'NEXT_PUBLIC_AD_SLOT_*']}
              link="https://www.google.com/adsense/"
            />

            <IntegrationRow
              name="Согласие (CMP)"
              status={integrations.cmpEnvProvider !== 'none' ? 'ok' : 'warn'}
              value={
                integrations.cmpEnvProvider === 'none'
                  ? 'встроенный баннер (не сертифицирован)'
                  : integrations.cmpEnvProvider
              }
              hint="Для персонализированной рекламы в ЕС Google требует сертифицированный CMP. Точка подключения готова."
              envVars={['NEXT_PUBLIC_CMP_PROVIDER', 'NEXT_PUBLIC_CMP_FUNDING_CHOICES_ID']}
            />

            <IntegrationRow
              name="Аналитика"
              status={integrations.analyticsEnvProvider !== 'none' ? 'ok' : 'off'}
              value={integrations.ga4Id || 'не подключена'}
              hint="События отправляются только после согласия пользователя (Consent Mode v2)."
              envVars={['NEXT_PUBLIC_ANALYTICS_PROVIDER', 'NEXT_PUBLIC_GA4_MEASUREMENT_ID']}
            />

            <IntegrationRow
              name="Search Console"
              status="manual"
              value="подтверждается вручную"
              hint="Подтвердите домен и отправьте sitemap.xml — инструкция в docs/SEO.md."
              envVars={[]}
              link="https://search.google.com/search-console"
            />

            <IntegrationRow
              name="Хранилище файлов"
              status="ok"
              value={integrations.storageDriver === 'local' ? 'локальный диск' : integrations.storageDriver}
              hint="Абстракция готова к переключению на S3/R2 без изменения кода вызова."
              envVars={['STORAGE_DRIVER', 'STORAGE_LOCAL_DIR']}
            />

            <IntegrationRow
              name="Popunder-сеть"
              status={integrations.popunderEnabled ? 'warn' : 'off'}
              value={integrations.popunderEnabled ? 'включена' : 'выключена'}
              hint="Popunder запрещён правилами AdSense. Загрузчик автоматически отключается, если задан ID издателя AdSense."
              envVars={['NEXT_PUBLIC_POPUNDER_ENABLED', 'NEXT_PUBLIC_POPUNDER_SCRIPT_URL']}
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} loading={busy}>
          Сохранить настройки
        </Button>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-emerald-700" role="status">
            <Check className="h-4 w-4" />
            Сохранено
          </span>
        )}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  )
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

function IntegrationRow({
  name,
  status,
  value,
  hint,
  envVars,
  link,
}: {
  name: string
  status: 'ok' | 'warn' | 'off' | 'manual'
  value: string
  hint: string
  envVars: string[]
  link?: string
}) {
  const badge = {
    ok: <Badge variant="success">подключено</Badge>,
    warn: <Badge variant="warning">внимание</Badge>,
    off: <Badge variant="neutral">выключено</Badge>,
    manual: <Badge variant="info">вручную</Badge>,
  }[status]

  return (
    <div className="rounded border border-[var(--color-border)] px-3 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{name}</span>
        {badge}
        <span className="text-xs text-[var(--color-muted)]">{value}</span>
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-xs text-[var(--color-accent)] hover:underline"
          >
            Открыть
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <p className="mt-1 text-xs text-[var(--color-muted)]">{hint}</p>
      {envVars.length > 0 && (
        <p className="mt-1 font-mono text-[0.6875rem] text-[var(--color-muted-soft)]">
          {envVars.join(' · ')}
        </p>
      )}
    </div>
  )
}
