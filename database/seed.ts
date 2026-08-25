/**
 * Idempotent seed.
 *
 * Safe to run repeatedly: everything is upserted by a stable key, so re-running
 * refreshes demo content without duplicating it and without touching real posts
 * created in the CMS.
 */

import { PrismaClient, type PostStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

import { generateCover } from './seed-images'
import { SEED_AUTHORS, SEED_CATEGORIES, SEED_POSTS, type SeedBlock } from './seed-content'

const prisma = new PrismaClient()

const SITE_KEY = 'de'
const SITE_NAME = process.env.SITE_NAME?.trim() || 'Lebenszeichen'
const SITE_URL = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

const AD_PLACEMENT_KEYS = [
  ['HOME_TOP', 'Startseite — oben'],
  ['HOME_FEED_1', 'Startseite — im Feed (1)'],
  ['HOME_FEED_2', 'Startseite — im Feed (2)'],
  ['CATEGORY_TOP', 'Kategorie — oben'],
  ['CATEGORY_FEED', 'Kategorie — im Feed'],
  ['ARTICLE_AFTER_INTRO', 'Artikel — nach dem Einstieg'],
  ['ARTICLE_INLINE', 'Artikel — im Text'],
  ['ARTICLE_END', 'Artikel — Ende'],
  ['SIDEBAR', 'Sidebar — oben'],
  ['SIDEBAR_STICKY', 'Sidebar — sticky'],
  ['MOBILE_STICKY', 'Mobil — Sticky unten'],
  ['SEARCH_TOP', 'Suche — oben'],
] as const

let blockCounter = 0
function toBlocks(blocks: SeedBlock[]) {
  return blocks.map((block) => {
    blockCounter += 1
    return { ...block, id: `seed_${blockCounter.toString(36)}` }
  })
}

function countWords(blocks: SeedBlock[]): number {
  const text = blocks
    .map((b) => [b.title, b.text, ...(b.items ?? [])].filter(Boolean).join(' '))
    .join(' ')
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

async function main() {
  console.log('▸ Seeding…')

  // ------------------------------------------------------------- site ----
  const site = await prisma.site.upsert({
    where: { key: SITE_KEY },
    update: { name: SITE_NAME, domain: new URL(SITE_URL).host },
    create: {
      key: SITE_KEY,
      name: SITE_NAME,
      domain: new URL(SITE_URL).host,
      locale: 'de-DE',
      language: 'de',
      timezone: 'Europe/Berlin',
    },
  })

  await prisma.siteSettings.upsert({
    where: { siteId: site.id },
    update: { siteName: SITE_NAME },
    create: {
      siteId: site.id,
      siteName: SITE_NAME,
      tagline: 'Geschichten, die bleiben',
      description:
        'Wahre Geschichten über Menschen, Familien, Tiere und Orte — sorgfältig recherchiert und ruhig erzählt.',
      postsPerPage: 12,
      seoTitlePattern: '%s | {siteName}',
      organizationName: SITE_NAME,
      // Ads stay off until a real AdSense account is connected.
      adsEnabled: false,
      adsProvider: 'adsense',
      adsDensity: 'balanced',
    },
  })
  console.log(`  site: ${site.name} (${site.domain})`)

  // ------------------------------------------------------- ad placements --
  for (const [index, [key, label]] of AD_PLACEMENT_KEYS.entries()) {
    await prisma.adPlacement.upsert({
      where: { siteId_key: { siteId: site.id, key } },
      update: { label },
      create: { siteId: site.id, key, label, enabled: true, order: index },
    })
  }
  console.log(`  ad placements: ${AD_PLACEMENT_KEYS.length}`)

  // ------------------------------------------------------------- owner ----
  const ownerEmail = process.env.SEED_ADMIN_EMAIL?.trim() || 'admin@example.com'
  const ownerPassword = process.env.SEED_ADMIN_PASSWORD?.trim() || 'AendereMich2026!'
  const existingOwner = await prisma.user.findUnique({ where: { email: ownerEmail } })
  if (!existingOwner) {
    await prisma.user.create({
      data: {
        email: ownerEmail,
        name: 'Redaktionsleitung',
        role: 'OWNER',
        passwordHash: await bcrypt.hash(ownerPassword, 12),
      },
    })
    console.log(`  owner created: ${ownerEmail} / ${ownerPassword}`)
    console.log('  ⚠ Passwort nach dem ersten Login ändern!')
  } else {
    console.log(`  owner exists: ${ownerEmail}`)
  }
  const owner = await prisma.user.findUniqueOrThrow({ where: { email: ownerEmail } })

  // -------------------------------------------------------- categories ----
  const categoryMap = new Map<string, string>()
  for (const category of SEED_CATEGORIES) {
    const row = await prisma.category.upsert({
      where: { siteId_slug: { siteId: site.id, slug: category.slug } },
      update: {
        name: category.name,
        description: category.description,
        intro: category.intro,
        order: category.order,
      },
      create: {
        siteId: site.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        intro: category.intro,
        order: category.order,
        enabled: true,
        showInNav: true,
        seoTitle: category.name,
        metaDescription: category.description.slice(0, 158),
      },
    })
    categoryMap.set(category.slug, row.id)
  }
  console.log(`  categories: ${categoryMap.size}`)

  // ----------------------------------------------------------- authors ----
  const authorMap = new Map<string, string>()
  for (const author of SEED_AUTHORS) {
    const row = await prisma.author.upsert({
      where: { siteId_slug: { siteId: site.id, slug: author.slug } },
      update: { name: author.name, role: author.role, bio: author.bio },
      create: {
        siteId: site.id,
        name: author.name,
        slug: author.slug,
        role: author.role,
        bio: author.bio,
        isDemo: true,
      },
    })
    authorMap.set(author.slug, row.id)
  }
  console.log(`  authors: ${authorMap.size} (alle als Demo markiert)`)

  // ------------------------------------------------------------- posts ----
  let created = 0
  let updated = 0

  for (const [index, post] of SEED_POSTS.entries()) {
    const categoryId = categoryMap.get(post.category)
    const authorId = authorMap.get(post.author)
    if (!categoryId) {
      console.warn(`  ! unbekannte Kategorie ${post.category} für ${post.slug}`)
      continue
    }

    const existing = await prisma.post.findUnique({
      where: { siteId_slug: { siteId: site.id, slug: post.slug } },
      select: { id: true, heroImageId: true },
    })

    // Cover
    let heroImageId = existing?.heroImageId ?? null
    if (!heroImageId) {
      const cover = await generateCover(index + 1, post.slug)
      const asset = await prisma.mediaAsset.create({
        data: {
          siteId: site.id,
          filename: cover.filename,
          originalName: cover.filename,
          url: cover.url,
          mimeType: 'image/webp',
          width: cover.width,
          height: cover.height,
          fileSize: cover.fileSize,
          blurDataUrl: cover.blurDataUrl,
          alt: `Abstrakte Titelgrafik zum Beitrag „${post.title}"`,
          caption: '',
          credit: 'Demo-Grafik',
          sourceType: 'AI_GENERATED',
          license: 'Eigene Demo-Grafik, frei verwendbar',
          uploadedById: owner.id,
        },
      })
      heroImageId = asset.id
    }

    const words = countWords(post.blocks)
    const publishedAt = new Date(Date.now() - post.daysAgo * 24 * 60 * 60 * 1000)
    const content = { version: 1, blocks: toBlocks(post.blocks) }

    const data = {
      siteId: site.id,
      title: post.title,
      subtitle: post.subtitle,
      slug: post.slug,
      excerpt: post.excerpt,
      content: content as object,
      status: 'PUBLISHED' as PostStatus,
      origin: 'SEED' as const,
      language: 'de',
      categoryId,
      authorId: authorId ?? null,
      heroImageId,
      seoTitle: post.title.slice(0, 60),
      metaDescription: post.excerpt.slice(0, 158),
      ogTitle: post.title,
      ogDescription: post.excerpt.slice(0, 160),
      socialHeadline: post.title.slice(0, 90),
      featured: post.featured ?? false,
      isEditorsPick: post.editorsPick ?? false,
      wordCount: words,
      readingTime: Math.max(1, Math.round(words / 200)),
      views: post.views,
      publishedAt,
      createdById: owner.id,
      updatedById: owner.id,
      publishedById: owner.id,
    }

    if (existing) {
      await prisma.post.update({ where: { id: existing.id }, data })
      updated += 1
    } else {
      await prisma.post.create({ data })
      created += 1
    }

    // Tags
    const postRow = await prisma.post.findUniqueOrThrow({
      where: { siteId_slug: { siteId: site.id, slug: post.slug } },
      select: { id: true },
    })
    await prisma.postTag.deleteMany({ where: { postId: postRow.id } })
    for (const tagName of post.tags) {
      const tagSlug = tagName
        .toLowerCase()
        .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      const tag = await prisma.tag.upsert({
        where: { siteId_slug: { siteId: site.id, slug: tagSlug } },
        update: {},
        create: { siteId: site.id, name: tagName, slug: tagSlug },
      })
      await prisma.postTag.create({ data: { postId: postRow.id, tagId: tag.id } })
    }
  }

  console.log(`  posts: ${created} neu, ${updated} aktualisiert`)

  // Two non-published examples so the admin list shows every state.
  const firstCategory = categoryMap.values().next().value!
  await prisma.post.upsert({
    where: { siteId_slug: { siteId: site.id, slug: 'demo-entwurf-redaktion' } },
    update: {},
    create: {
      siteId: site.id,
      title: 'Beispiel-Entwurf: Noch nicht veröffentlicht',
      subtitle: 'Dieser Eintrag zeigt, wie ein Entwurf in der Übersicht aussieht.',
      slug: 'demo-entwurf-redaktion',
      excerpt: 'Ein Entwurf zur Veranschaulichung des Redaktionsworkflows.',
      content: {
        version: 1,
        blocks: [
          { id: 'draft_1', type: 'paragraph', lead: true, text: 'Dies ist ein Entwurf. Er ist öffentlich nicht sichtbar.' },
        ],
      } as object,
      status: 'DRAFT',
      origin: 'SEED',
      categoryId: firstCategory,
      wordCount: 12,
      readingTime: 1,
      createdById: owner.id,
      updatedById: owner.id,
    },
  })

  await prisma.post.upsert({
    where: { siteId_slug: { siteId: site.id, slug: 'demo-geplant-morgen' } },
    update: {},
    create: {
      siteId: site.id,
      title: 'Beispiel: Geplante Veröffentlichung',
      subtitle: 'Erscheint automatisch zum eingestellten Zeitpunkt.',
      slug: 'demo-geplant-morgen',
      excerpt: 'Ein geplanter Beitrag zur Veranschaulichung der Terminierung.',
      content: {
        version: 1,
        blocks: [
          { id: 'sched_1', type: 'paragraph', lead: true, text: 'Dieser Beitrag ist terminiert und erscheint automatisch.' },
        ],
      } as object,
      status: 'SCHEDULED',
      origin: 'SEED',
      categoryId: firstCategory,
      wordCount: 11,
      readingTime: 1,
      publishedAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdById: owner.id,
      updatedById: owner.id,
    },
  })

  console.log('▸ Seed abgeschlossen.')
}

main()
  .catch((error) => {
    console.error('Seed fehlgeschlagen:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
