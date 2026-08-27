/** Prints a launch-readiness snapshot of the live site. */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const [published, seeded, own, categories, media, users] = await Promise.all([
    prisma.post.count({ where: { status: 'PUBLISHED' } }),
    prisma.post.count({ where: { origin: 'SEED' } }),
    prisma.post.count({ where: { origin: { not: 'SEED' } } }),
    prisma.category.count(),
    prisma.mediaAsset.count(),
    prisma.user.count(),
  ])
  const s = await prisma.siteSettings.findFirst()

  console.log(`  постов опубликовано : ${published}  (демо: ${seeded}, своих: ${own})`)
  console.log(`  категорий / медиа   : ${categories} / ${media}`)
  console.log(`  пользователей       : ${users}`)
  console.log(`  реклама             : enabled=${s?.adsEnabled} provider=${s?.adsProvider} density=${s?.adsDensity}`)
  console.log(`  юр. данные заполнены: ${Boolean(s?.legalCompanyName && s?.legalAddress && s?.legalEmail)}`)
  console.log(`  CMP / аналитика     : ${s?.cmpProvider} / ${s?.analyticsProvider}`)
}

main()
  .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })
  .finally(() => prisma.$disconnect())
