/**
 * Removes seeded demo content from a live site.
 *
 *   npx tsx --env-file=.env scripts/purge-demo.ts --dry
 *   npx tsx --env-file=.env scripts/purge-demo.ts --yes
 *
 * Deletes: posts with origin=SEED, demo authors, and demo media assets that
 * nothing else references. Categories are kept — they are real editorial
 * structure, not demo data.
 *
 * Demo content must not reach Google's index: AdSense reviewers and the
 * "low value content" classifier both read it as a template site, and a
 * rejection is far more expensive than an empty site.
 */
import { unlink } from 'node:fs/promises'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const apply = process.argv.includes('--yes')

async function main() {
  const seedPosts = await prisma.post.findMany({
    where: { origin: 'SEED' },
    select: { id: true, slug: true, title: true, heroImageId: true, ogImageId: true },
  })

  const demoAuthors = await prisma.author.findMany({
    where: { isDemo: true },
    select: { id: true, name: true },
  })

  // Media is only safe to remove once no surviving post points at it.
  const survivingPostIds = (
    await prisma.post.findMany({
      where: { origin: { not: 'SEED' } },
      select: { heroImageId: true, ogImageId: true },
    })
  ).flatMap((p) => [p.heroImageId, p.ogImageId].filter(Boolean) as string[])

  const demoMedia = await prisma.mediaAsset.findMany({
    where: {
      filename: { startsWith: 'demo-' },
      id: { notIn: survivingPostIds.length ? survivingPostIds : ['__none__'] },
    },
    select: { id: true, filename: true, url: true },
  })

  console.log(`  постов SEED к удалению : ${seedPosts.length}`)
  console.log(`  демо-авторов           : ${demoAuthors.length}`)
  console.log(`  демо-медиа             : ${demoMedia.length}`)
  console.log(`  останется постов       : ${await prisma.post.count({ where: { origin: { not: 'SEED' } } })}`)

  if (!apply) {
    console.log('\n  --dry: ничего не удалено. Для применения — флаг --yes')
    return
  }

  // Order matters: rows that reference a post must go before the post itself,
  // and the post must release its media before the media row is removed.
  const ids = seedPosts.map((p) => p.id)
  await prisma.postTag.deleteMany({ where: { postId: { in: ids } } })
  await prisma.postCategory.deleteMany({ where: { postId: { in: ids } } })
  await prisma.postRevision.deleteMany({ where: { postId: { in: ids } } })
  await prisma.postRedirect.deleteMany({ where: { postId: { in: ids } } })
  await prisma.aITask.updateMany({ where: { postId: { in: ids } }, data: { postId: null } })
  await prisma.post.deleteMany({ where: { id: { in: ids } } })
  console.log(`  ✓ удалено постов: ${ids.length}`)

  await prisma.author.deleteMany({ where: { id: { in: demoAuthors.map((a) => a.id) } } })
  console.log(`  ✓ удалено авторов: ${demoAuthors.length}`)

  await prisma.mediaAsset.deleteMany({ where: { id: { in: demoMedia.map((m) => m.id) } } })
  let files = 0
  for (const asset of demoMedia) {
    if (!asset.url.startsWith('/uploads/')) continue
    const file = path.join(process.cwd(), 'public', asset.url.replace(/^\//, ''))
    try {
      await unlink(file)
      files += 1
    } catch {
      // Already gone, or a variant name that no longer matches — not fatal.
    }
  }
  console.log(`  ✓ удалено медиа: ${demoMedia.length} записей, ${files} файлов`)

  const left = await prisma.post.count()
  const pub = await prisma.post.count({ where: { status: 'PUBLISHED' } })
  console.log(`\n  осталось: ${left} постов, из них опубликовано ${pub}`)
}

main()
  .catch((e) => { console.error('  Ошибка:', e instanceof Error ? e.message : e); process.exit(1) })
  .finally(() => prisma.$disconnect())
