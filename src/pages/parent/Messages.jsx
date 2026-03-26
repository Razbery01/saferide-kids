import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import { Send, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'

export default function Messages() {
  const { profile } = useAuth()
  const [conversations, setConversations] = useState([])
  const [selectedConvo, setSelectedConvo] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    fetchConversations()
  }, [profile])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!selectedConvo || !profile) return
    const channel = supabase
      .channel(`messages-${selectedConvo.id}-${profile.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new
          if (
            (msg.sender_id === profile.id && msg.receiver_id === selectedConvo.id) ||
            (msg.sender_id === selectedConvo.id && msg.receiver_id === profile.id)
          ) {
            setMessages(prev => [...prev, msg])
          }
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [selectedConvo, profile])

  async function fetchConversations() {
    if (!profile) return
    // Get drivers associated with children
    const { data: children } = await supabase
      .from('children')
      .select('child_route_assignments(routes(driver_id, drivers(id, full_name, vehicle_description)))')
      .eq('parent_id', profile.id)

    const drivers = []
    const seen = new Set()
    ;(children || []).forEach(child => {
      child.child_route_assignments?.forEach(a => {
        const d = a.routes?.drivers
        if (d && !seen.has(d.id)) {
          seen.add(d.id)
          drivers.push(d)
        }
      })
    })
    setConversations(drivers)
    if (drivers.length > 0 && !selectedConvo) {
      selectConversation(drivers[0])
    }
  }

  async function selectConversation(driver) {
    setSelectedConvo(driver)
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${driver.id}),and(sender_id.eq.${driver.id},receiver_id.eq.${profile.id})`)
      .order('created_at', { ascending: true })
      .limit(100)

    setMessages(data || [])

    // Mark unread messages as read
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('sender_id', driver.id)
      .eq('receiver_id', profile.id)
      .is('read_at', null)
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!newMessage.trim() || !selectedConvo) return
    setSending(true)

    await supabase.from('messages').insert({
      sender_id: profile.id,
      receiver_id: selectedConvo.id,
      content: newMessage.trim(),
      is_broadcast: false,
    })

    setNewMessage('')
    setSending(false)
  }

  if (conversations.length === 0) {
    return <EmptyState icon={MessageSquare} title="No conversations" description="Messages with your child's driver will appear here." />
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Conversation tabs */}
      {conversations.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-3 mb-3">
          {conversations.map((driver) => (
            <button
              key={driver.id}
              onClick={() => selectConversation(driver)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                selectedConvo?.id === driver.id
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-text-secondary'
              }`}
            >
              {driver.full_name}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-3">
        {messages.map((msg) => {
          const isMe = msg.sender_id === profile.id
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                isMe
                  ? 'bg-primary text-white rounded-br-md'
                  : 'bg-gray-100 text-text-primary rounded-bl-md'
              }`}>
                <p className="text-sm">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${isMe ? 'text-white/60' : 'text-text-secondary'}`}>
                  {msg.created_at && format(new Date(msg.created_at), 'h:mm a')}
                  {msg.read_at && isMe && ' • Read'}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
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
