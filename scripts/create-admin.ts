/**
 * Interactive admin creation.
 *   npm run create-admin -- --email you@example.com --name "Name" --role OWNER
 * Password is read from stdin so it never lands in shell history.
 */

import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'

import { PrismaClient, type Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? undefined : process.argv[index + 1]
}

async function main() {
  const rl = createInterface({ input: stdin, output: stdout })

  const email = (arg('email') ?? (await rl.question('E-Mail: '))).trim().toLowerCase()
  const name = (arg('name') ?? (await rl.question('Name: '))).trim()
  const roleInput = (arg('role') ?? (await rl.question('Rolle (OWNER/ADMIN/EDITOR) [OWNER]: '))).trim()
  const role = (roleInput || 'OWNER').toUpperCase() as Role
  const password = (await rl.question('Passwort (min. 10 Zeichen): ')).trim()

  rl.close()

  if (!email.includes('@')) throw new Error('Ungültige E-Mail-Adresse.')
  if (password.length < 10) throw new Error('Das Passwort muss mindestens 10 Zeichen haben.')
  if (!['OWNER', 'ADMIN', 'EDITOR'].includes(role)) throw new Error('Ungültige Rolle.')

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, role, passwordHash, active: true, failedLogins: 0, lockedUntil: null },
    create: { email, name, role, passwordHash },
  })

  console.log(`✓ ${user.email} (${user.role}) ist einsatzbereit.`)
}

main()
  .catch((error) => {
    console.error('Fehler:', error instanceof Error ? error.message : error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
