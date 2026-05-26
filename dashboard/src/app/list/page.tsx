'use client'
import { useState } from 'react'
import type { Tier } from '@/lib/types'

declare global {
  interface Window {
    ethereum?: {
      request: (args: {
        method: string
        params?: unknown[]
      }) => Promise<unknown>
    }
  }
}

const MANTLE_CHAIN_ID = '0x1388'

type FormState = {
  name: string
  version: string
  endpoint: string
  pricePerCall: string
  requiresEscrow: boolean
  metadataURI: string
  tier: Tier
}

const INITIAL_FORM: FormState = {
  name: '',
  version: '',
  endpoint: '',
  pricePerCall: '0',
  requiresEscrow: false,
  metadataURI: '',
  tier: 'FREE',
}

const TIER_PRICES: Record<Tier, string> = {
  FREE: 'Free',
  BASIC: '$10 USDe/mo',
  PRO: '$50 USDe/mo',
}

export default function ListPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [account, setAccount] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{
    skillId: string
    txHash: string
  } | null>(null)
  const [error, setError] = useState<string>('')

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function connectWallet() {
    setError('')
    if (!window.ethereum) {
      setError('No Ethereum wallet detected. Install MetaMask or a compatible wallet.')
      return
    }
    try {
      const accounts = (await window.ethereum.request({
        method: 'eth_requestAccounts',
      })) as string[]
      setAccount(accounts[0])

      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: MANTLE_CHAIN_ID }],
        })
      } catch (switchErr: unknown) {
        if ((switchErr as { code?: number }).code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: MANTLE_CHAIN_ID,
                chainName: 'Mantle',
                nativeCurrency: { name: 'MNT', symbol: 'MNT', decimals: 18 },
                rpcUrls: ['https://rpc.mantle.xyz'],
                blockExplorerUrls: ['https://mantlescan.xyz'],
              },
            ],
          })
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet.')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!account) {
      setError('Connect your wallet first.')
      return
    }
    if (!form.name || !form.version || !form.endpoint) {
      setError('Name, version, and endpoint are required.')
      return
    }
    if (!form.metadataURI.startsWith('ipfs://')) {
      setError('Metadata URI must be an IPFS link (ipfs://...).')
      return
    }

    setSubmitting(true)
    try {
      const facilitatorUrl = process.env.NEXT_PUBLIC_FACILITATOR_URL
      if (!facilitatorUrl) throw new Error('Facilitator URL not configured.')

      const res = await fetch(`${facilitatorUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, owner: account }),
      })
      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      const data = (await res.json()) as { skillId: string; txHash: string }
      setResult(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed.')
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-lf-accent-muted flex items-center justify-center mx-auto text-3xl">
          ✓
        </div>
        <h1
          className="text-3xl font-bold text-lf-ink"
          style={{ fontFamily: 'var(--font-syne)' }}
        >
          Your service is live in the Bazaar
        </h1>
        <p className="text-lf-muted">
          Your skill has been registered on Mantle and is now discoverable.
        </p>

        <div className="bg-lf-surface border border-lf-border rounded-xl p-5 text-left space-y-3">
          <div>
            <p className="text-xs font-mono text-lf-muted uppercase tracking-widest mb-0.5">
              Skill ID
            </p>
            <p className="font-mono text-sm text-lf-ink break-all">{result.skillId}</p>
          </div>
          <div>
            <p className="text-xs font-mono text-lf-muted uppercase tracking-widest mb-0.5">
              Transaction
            </p>
            <a
              href={`https://mantlescan.xyz/tx/${result.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm text-lf-accent hover:underline break-all"
            >
              {result.txHash}
            </a>
          </div>
        </div>

        <button
          onClick={() => { setResult(null); setForm(INITIAL_FORM); setAccount(null) }}
          className="text-sm text-lf-muted hover:text-lf-ink transition-colors"
        >
          List another service →
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1
          className="text-4xl font-extrabold text-lf-ink mb-2"
          style={{ fontFamily: 'var(--font-syne)' }}
        >
          List a Service
        </h1>
        <p className="text-lf-muted">
          Register your agent skill in the SkillRegistry and publish it to the Bazaar.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Skill Name */}
        <Field label="Skill Name" required>
          <input
            type="text"
            placeholder="e.g. GPT-4o Code Review"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className={INPUT_CLS}
            required
          />
        </Field>

        {/* Version */}
        <Field label="Version" required hint="SemVer format: 1.0.0">
          <input
            type="text"
            placeholder="1.0.0"
            value={form.version}
            onChange={(e) => update('version', e.target.value)}
            className={INPUT_CLS}
            pattern="^\d+\.\d+\.\d+$"
            required
          />
        </Field>

        {/* Endpoint */}
        <Field label="Endpoint URL" required hint="The URL consumers will call after payment">
          <input
            type="url"
            placeholder="https://your-service.example.com/run"
            value={form.endpoint}
            onChange={(e) => update('endpoint', e.target.value)}
            className={INPUT_CLS}
            required
          />
        </Field>

        {/* Price */}
        <Field label="Price per Call (USDC)" required hint="Enter 0 for free services">
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.50"
            value={form.pricePerCall}
            onChange={(e) => update('pricePerCall', e.target.value)}
            className={INPUT_CLS}
            required
          />
        </Field>

        {/* Escrow toggle */}
        <Field label="Require Escrow for Large Jobs">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => update('requiresEscrow', !form.requiresEscrow)}
              className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${
                form.requiresEscrow ? 'bg-lf-accent' : 'bg-lf-border'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  form.requiresEscrow ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </div>
            <span className="text-sm text-lf-muted">
              {form.requiresEscrow
                ? 'Enabled — payment locked in x402Escrow until job completes'
                : 'Disabled — instant payment on request'}
            </span>
          </label>
        </Field>

        {/* Metadata URI */}
        <Field
          label="Metadata URI"
          required
          hint="IPFS link to a JSON spec (name, description, capabilities)"
        >
          <input
            type="text"
            placeholder="ipfs://Qm..."
            value={form.metadataURI}
            onChange={(e) => update('metadataURI', e.target.value)}
            className={INPUT_CLS}
            required
          />
        </Field>

        {/* Tier */}
        <Field label="Listing Tier" required hint="Higher tiers get featured placement in the Bazaar">
          <div className="grid grid-cols-3 gap-3">
            {(['FREE', 'BASIC', 'PRO'] as Tier[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => update('tier', t)}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  form.tier === t
                    ? 'border-lf-accent bg-lf-accent-muted'
                    : 'border-lf-border bg-lf-surface hover:border-lf-ink'
                }`}
              >
                <p className={`text-xs font-mono font-bold ${form.tier === t ? 'text-lf-accent' : 'text-lf-muted'}`}>
                  {t}
                </p>
                <p className="text-xs text-lf-muted mt-0.5">{TIER_PRICES[t]}</p>
              </button>
            ))}
          </div>
        </Field>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>
        )}

        {/* Submit */}
        {!account ? (
          <button
            type="button"
            onClick={connectWallet}
            className="w-full py-3 rounded-xl font-semibold text-white bg-lf-ink hover:bg-lf-accent transition-colors"
          >
            Connect Wallet to Continue
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-lf-accent-muted rounded-lg px-3 py-2">
              <span className="w-2 h-2 rounded-full bg-lf-accent" />
              <span className="text-xs font-mono text-lf-accent truncate">{account}</span>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl font-semibold text-white bg-lf-accent hover:bg-lf-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Registering…
                </>
              ) : (
                'Register Skill →'
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}

const INPUT_CLS =
  'w-full bg-lf-surface border border-lf-border rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-lf-accent transition-colors placeholder:text-lf-muted'

function Field({
  label,
  children,
  hint,
  required,
}: {
  label: string
  children: React.ReactNode
  hint?: string
  required?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-sm font-semibold text-lf-ink">
        {label}
        {required && <span className="text-lf-accent">*</span>}
      </label>
      {hint && <p className="text-xs text-lf-muted">{hint}</p>}
      {children}
    </div>
  )
}
