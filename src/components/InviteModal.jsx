import { useState } from 'react'
import { Send, UserPlus, Copy, CheckCircle, Share2, MessageSquare } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import Modal from './ui/Modal'
import Button from './ui/Button'
import Input from './ui/Input'

export default function InviteModal({ isOpen, onClose, inviteType, routeCode }) {
  const { profile } = useAuth()
  const [contacts, setContacts] = useState([{ name: '', phone: '' }])
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState([])
  const [copied, setCopied] = useState(false)

  const isDriverInviting = inviteType === 'driver_invites_parent'
  const title = isDriverInviting ? 'Invite Parents' : 'Invite a Driver'
  const description = isDriverInviting
    ? 'Send an SMS invite to parents so they can track their children on your route.'
    : 'Know a school transport driver? Invite them to join SafeRide Kids.'

  function addContact() {
    if (contacts.length >= 10) return
    setContacts(prev => [...prev, { name: '', phone: '' }])
  }

  function updateContact(index, field, value) {
    setContacts(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c))
  }

  function removeContact(index) {
    if (contacts.length <= 1) return
    setContacts(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSend() {
    const valid = contacts.filter(c => c.phone.trim())
    if (valid.length === 0) return

    setSending(true)
    const newResults = []

    for (const contact of valid) {
      try {
        const res = await fetch('/.netlify/functions/send-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: contact.phone.trim(),
            inviterName: profile?.full_name || 'A SafeRide Kids user',
            inviterRole: profile?.role,
            routeCode: routeCode || null,
            inviteType,
          }),
        })

        const data = await res.json()

        // Also store inviter_id in the invite
        if (profile?.id) {
          await supabase.from('invites').update({ inviter_id: profile.id })
            .eq('phone', contact.phone.trim().replace(/\s+/g, '').replace(/^0/, '+27'))
            .is('inviter_id', null)
        }

        newResults.push({
          name: contact.name || contact.phone,
          success: data.success,
          method: data.method,
          link: data.link,
        })
      } catch {
        newResults.push({ name: contact.name || contact.phone, success: false })
      }
    }

    setResults(newResults)
    setSending(false)
  }

  function getShareLink() {
    const base = window.location.origin
    if (isDriverInviting && routeCode) {
      return `${base}/register?role=parent&code=${routeCode}`
    }
    return `${base}/register?role=${isDriverInviting ? 'parent' : 'driver'}`
  }

  function copyLink() {
    navigator.clipboard.writeText(getShareLink())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function nativeShare() {
    const link = getShareLink()
    const text = isDriverInviting
      ? `Join SafeRide Kids to track your child's school transport in real-time.${routeCode ? ` Use route code: ${routeCode}` : ''}`
      : 'Join SafeRide Kids as a school transport driver. Manage routes and connect with parents.'

    if (navigator.share) {
      try {
        await navigator.share({ title: 'SafeRide Kids', text, url: link })
      } catch { /* user cancelled */ }
    } else {
      copyLink()
    }
  }

  function handleClose() {
    setContacts([{ name: '', phone: '' }])
    setResults([])
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="md">
      {results.length > 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">Invite results:</p>
          <div className="space-y-2">
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-background rounded-xl">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${r.success ? 'bg-green-100' : 'bg-red-100'}`}>
                  {r.success ? <CheckCircle className="h-4 w-4 text-green-600" /> : <span className="text-red-600 text-xs font-bold">!</span>}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">{r.name}</p>
                  <p className="text-xs text-text-secondary">
                    {r.success
                      ? r.method === 'sms' ? 'SMS sent' : 'Invite saved (SMS will send once configured)'
                      : 'Failed to send'}
                  </p>
                </div>
                {r.link && (
                  <button
                    onClick={() => { navigator.clipboard.writeText(r.link); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                    className="text-xs text-primary font-medium hover:underline"
                  >
                    Copy link
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => { setResults([]); setContacts([{ name: '', phone: '' }]) }}>
              Invite More
            </Button>
            <Button fullWidth onClick={handleClose}>Done</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">{description}</p>

          {/* Share link section */}
          <div className="bg-primary/5 rounded-xl p-3">
            <p className="text-xs font-medium text-text-secondary mb-2">Share invite link</p>
            <div className="flex gap-2">
              <div className="flex-1 bg-white rounded-lg border border-border px-3 py-2 text-xs text-text-secondary truncate">
                {getShareLink()}
              </div>
              <button
                onClick={copyLink}
                className="px-3 py-2 bg-white border border-border rounded-lg text-xs font-medium text-text-primary hover:bg-gray-50 transition flex items-center gap-1"
              >
                {copied ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              {navigator.share && (
                <button
                  onClick={nativeShare}
                  className="px-3 py-2 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-dark transition flex items-center gap-1"
                >
                  <Share2 className="h-3.5 w-3.5" /> Share
                </button>
              )}
            </div>
          </div>

          {/* SMS invite section */}
          <div>
            <p className="text-xs font-medium text-text-secondary mb-2">
              <MessageSquare className="h-3.5 w-3.5 inline mr-1" />
              Or send SMS invites
            </p>
            <div className="space-y-2">
              {contacts.map((contact, i) => (
                <div key={i} className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Name (optional)"
                      value={contact.name}
                      onChange={e => updateContact(i, 'name', e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      placeholder="+27 XX XXX XXXX"
                      type="tel"
                      value={contact.phone}
                      onChange={e => updateContact(i, 'phone', e.target.value)}
                      required
                    />
                  </div>
                  {contacts.length > 1 && (
                    <button onClick={() => removeContact(i)} className="px-2 text-text-secondary hover:text-danger transition text-sm">
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            {contacts.length < 10 && (
              <button onClick={addContact} className="text-xs text-primary font-medium mt-2 hover:underline">
                + Add another contact
              </button>
            )}
          </div>

          <Button fullWidth onClick={handleSend} loading={sending} disabled={!contacts.some(c => c.phone.trim())}>
            <Send className="h-4 w-4" /> Send {contacts.filter(c => c.phone.trim()).length || ''} Invite{contacts.filter(c => c.phone.trim()).length !== 1 ? 's' : ''}
          </Button>
        </div>
      )}
    </Modal>
  )
}
