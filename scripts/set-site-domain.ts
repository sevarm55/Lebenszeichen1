/**
 * Updates the Site row's domain.
 *   npx tsx --env-file=.env scripts/set-site-domain.ts lebenszeichen.io
 * Called by scripts/set-domain.sh; not usually run by hand.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const domain = process.argv[2]?.trim()
  if (!domain) throw new Error('Usage: set-site-domain.ts <domain>')

  const { count } = await prisma.site.updateMany({ where: { key: 'de' }, data: { domain } })
  if (count === 0) throw new Error('No site row with key "de" — run the seed first.')
  console.log(`  Site.domain -> ${domain}`)
}

main()
  .catch((error) => {
    console.error('  Fehler:', error instanceof Error ? error.message : error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
