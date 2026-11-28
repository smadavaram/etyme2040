'use client'

import { useState } from 'react'

/** The one-time link from the confirmation email: one press is the person's yes. */
export default function LinkAddressPage({ params }: { params: { token: string } }) {
  const [says, setSays] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function confirm() {
    setBusy(true)
    const r = await fetch('/api/account/sign-in-addresses/confirm', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: params.token }),
    })
    const j = await r.json().catch(() => ({}))
    setSays(j?.data?.says ?? j?.error?.message ?? 'That did not go through. Try again.')
    setDone(r.ok)
    setBusy(false)
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-serif text-2xl text-etyme-ink">Add this address to your sign-in</h1>
      <p className="mt-3 text-sm text-etyme-muted">Press the button to use this address as another way to sign in to your own Etyme record.</p>
      {says && <p role="status" className="mt-4 text-sm text-etyme-ink">{says}</p>}
      {!done && (
        <button type="button" onClick={confirm} disabled={busy}
          className="mt-6 px-4 py-3 rounded-lg bg-etyme-action text-white text-sm font-medium">
          Yes, add this address
        </button>
      )}
      {done && <a href="/login" className="mt-6 inline-block text-sm text-etyme-action underline">Go to sign in</a>}
    </main>
  )
}
