'use client'

import { signOut } from '@/lib/actions/auth'

export default function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="w-full text-left rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
      >
        Cerrar sesión
      </button>
    </form>
  )
}
