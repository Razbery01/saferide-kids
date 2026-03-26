import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import { Send, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'

export default function DriverMessages() {
  const { profile } = useAuth()
  const [parents, setParents] = useState([])
  const [selectedParent, setSelectedParent] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => { fetchParents() }, [profile])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    if (!selectedParent) return
    const channel = supabase
      .channel(`driver-msgs-${selectedParent.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new
        if ((msg.sender_id === profile.id && msg.receiver_id === selectedParent.id) ||
            (msg.sender_id === selectedParent.id && msg.receiver_id === profile.id)) {
          setMessages(prev => [...prev, msg])
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [selectedParent])

  async function fetchParents() {
    if (!profile) return
    const { data: routes } = await supabase
      .from('routes')
      .select('child_route_assignments(children(parent_id, users:parent_id(id, full_name)))')
      .eq('driver_id', profile.id)

    const parentMap = new Map()
    routes?.forEach(r => r.child_route_assignments?.forEach(a => {
      const u = a.children?.users
      if (u && !parentMap.has(u.id)) parentMap.set(u.id, u)
    }))
    const list = Array.from(parentMap.values())
    setParents(list)
    if (list.length > 0) selectParent(list[0])
  }

  async function selectParent(parent) {
    setSelectedParent(parent)
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${parent.id}),and(sender_id.eq.${parent.id},receiver_id.eq.${profile.id})`)
      .order('created_at', { ascending: true })
      .limit(100)
    setMessages(data || [])
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!newMessage.trim() || !selectedParent) return
    setSending(true)
    await supabase.from('messages').insert({
      sender_id: profile.id,
      receiver_id: selectedParent.id,
      content: newMessage.trim(),
      is_broadcast: false,
    })
    setNewMessage('')
    setSending(false)
  }

  if (parents.length === 0) return <EmptyState icon={MessageSquare} title="No messages" description="Messages from parents will appear here." />

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {parents.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-3 mb-3">
          {parents.map(p => (
            <button
              key={p.id}
              onClick={() => selectParent(p)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                selectedParent?.id === p.id ? 'bg-primary text-white' : 'bg-gray-100 text-text-secondary'
              }`}
            >
              {p.full_name}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-3 mb-3">
        {messages.map(msg => {
          const isMe = msg.sender_id === profile.id
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                isMe ? 'bg-primary text-white rounded-br-md' : 'bg-gray-100 text-text-primary rounded-bl-md'
              }`}>
                <p className="text-sm">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${isMe ? 'text-white/60' : 'text-text-secondary'}`}>
                  {msg.created_at && format(new Date(msg.created_at), 'h:mm a')}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <Button type="submit" disabled={!newMessage.trim()} loading={sending}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}
