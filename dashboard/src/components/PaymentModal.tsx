'use client'
import { useState } from 'react'
import type { Skill } from '@/lib/types'

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

const MANTLE_CHAIN_ID = '0x1388' // 5000

interface PaymentModalProps {
  skill: Skill
  onClose: () => void
}

type Step = 'connect' | 'switch' | 'pay' | 'success' | 'error'

export default function PaymentModal({ skill, onClose }: PaymentModalProps) {
  const [step, setStep] = useState<Step>('connect')
  const [account, setAccount] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>('')

  async function connectWallet() {
    if (!window.ethereum) {
      setErrorMsg('No Ethereum wallet detected. Install MetaMask or a compatible wallet.')
      setStep('error')
      return
    }
    try {
      const accounts = (await window.ethereum.request({
        method: 'eth_requestAccounts',
      })) as string[]
      setAccount(accounts[0])
      setStep('switch')
      await switchToMantle()
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Wallet connection failed.')
      setStep('error')
    }
  }

  async function switchToMantle() {
    try {
      await window.ethereum!.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: MANTLE_CHAIN_ID }],
      })
      setStep('pay')
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 4902) {
        try {
          await window.ethereum!.request({
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
          setStep('pay')
        } catch {
          setErrorMsg('Could not add Mantle network. Please add it manually.')
          setStep('error')
        }
      } else {
        setErrorMsg('Failed to switch to Mantle. Please switch manually in your wallet.')
        setStep('error')
      }
    }
  }

  async function payAndAccess() {
    try {
      const facilitatorUrl = process.env.NEXT_PUBLIC_FACILITATOR_URL
      if (!facilitatorUrl) throw new Error('Facilitator URL not configured.')

      const res = await fetch(`${facilitatorUrl}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillId: skill.id,
          consumer: account,
          amount: skill.pricePerCall,
          token: skill.acceptedToken,
        }),
      })
      if (!res.ok) throw new Error(`Payment failed: HTTP ${res.status}`)
      const receipt = (await res.json()) as { settlementTx?: string }
      setTxHash(receipt.settlementTx ?? null)
      setStep('success')
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Payment failed.')
      setStep('error')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-lf-surface border border-lf-border rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 animate-slide-up">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2
              className="text-xl font-bold text-lf-ink"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              Use This Skill
            </h2>
            <p className="text-sm text-lf-muted mt-0.5">{skill.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-lf-muted hover:text-lf-ink text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="bg-lf-bg rounded-lg p-4 mb-5 flex items-center justify-between">
          <span className="text-sm text-lf-muted">Payment required</span>
          <span className="font-mono font-bold text-lf-ink">
            {skill.tier === 'FREE' ? (
              <span className="text-lf-accent">Free</span>
            ) : (
              `$${skill.pricePerCall} ${skill.acceptedToken}`
            )}
          </span>
        </div>

        {step === 'connect' && (
          <div className="space-y-3">
            <p className="text-sm text-lf-muted">
              Connect your wallet to access this agent service on Mantle Network.
            </p>
            <button
              onClick={connectWallet}
              className="w-full py-3 rounded-xl font-semibold text-white bg-lf-ink hover:bg-lf-accent transition-colors"
            >
              Connect Wallet
            </button>
          </div>
        )}

        {step === 'switch' && (
          <div className="space-y-3 text-center">
            <p className="text-sm text-lf-muted">Switching to Mantle Network…</p>
            <div className="w-6 h-6 border-2 border-lf-accent border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}

        {step === 'pay' && (
          <div className="space-y-4">
            <div className="bg-lf-accent-muted rounded-lg px-3 py-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-lf-accent" />
              <span className="text-xs font-mono text-lf-accent truncate">{account}</span>
            </div>
            <p className="text-sm text-lf-muted">
              Your payment will be locked in escrow and released to the provider after job completion.
            </p>
            <button
              onClick={payAndAccess}
              className="w-full py-3 rounded-xl font-semibold text-white bg-lf-accent hover:bg-lf-accent-hover transition-colors"
            >
              {skill.tier === 'FREE' ? 'Access Skill →' : `Pay & Access →`}
            </button>
          </div>
        )}

        {step === 'success' && (
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-lf-accent-muted flex items-center justify-center mx-auto text-2xl">
              ✓
            </div>
            <p className="font-semibold text-lf-ink">Access granted</p>
            <p className="text-sm text-lf-muted">
              Endpoint is now available. Your session is authenticated via the facilitator.
            </p>
            {txHash && (
              <a
                href={`https://mantlescan.xyz/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-lf-accent hover:underline block truncate"
              >
                {txHash}
              </a>
            )}
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl font-semibold text-lf-surface bg-lf-ink hover:bg-lf-accent transition-colors text-sm"
            >
              Done
            </button>
          </div>
        )}

        {step === 'error' && (
          <div className="space-y-4">
            <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{errorMsg}</p>
            <button
              onClick={() => setStep('connect')}
              className="w-full py-2.5 rounded-xl font-semibold text-lf-ink border border-lf-border hover:border-lf-accent transition-colors text-sm"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
