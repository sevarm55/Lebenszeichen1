import bcrypt from 'bcryptjs'

const ROUNDS = 12

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS)
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

export interface PasswordCheck {
  ok: boolean
  problems: string[]
}

export function checkPasswordStrength(plain: string): PasswordCheck {
  const problems: string[] = []
  if (plain.length < 10) problems.push('Mindestens 10 Zeichen')
  if (!/[a-zа-яё]/i.test(plain)) problems.push('Mindestens ein Buchstabe')
  if (!/[0-9]/.test(plain)) problems.push('Mindestens eine Ziffer')
  return { ok: problems.length === 0, problems }
}
