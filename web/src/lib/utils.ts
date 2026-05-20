import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatUsd(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return '—'
  return `$${n.toFixed(2)}`
}

export function formatPct(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return '—'
  return `${n.toFixed(1)}%`
}
