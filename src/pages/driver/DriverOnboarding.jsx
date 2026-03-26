import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { Car, FileText, CheckCircle, Upload, X } from 'lucide-react'

export default function DriverOnboarding() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  const [form, setForm] = useState({
    id_number: '',
    licence_number: '',
    vehicle_registration: '',
    vehicle_description: '',
  })

  function updateForm(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function generateRouteCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length))
    return code
  }

  function handleFileSelect(e) {
    const selected = Array.from(e.target.files || [])
    const valid = selected.filter(f => f.size <= 5 * 1024 * 1024 && f.type.startsWith('image/'))
    setFiles(prev => [...prev, ...valid].slice(0, 4))
  }

  function removeFile(index) {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  async function uploadFiles() {
    if (files.length === 0) return []
    setUploading(true)
    const urls = []

    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `driver-docs/${profile.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { data, error } = await supabase.storage.from('documents').upload(path, file)
      if (error) {
        console.error('Upload error:', error)
        continue
      }
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
      urls.push(publicUrl)
    }

    setUploading(false)
    return urls
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const routeCode = generateRouteCode()
      const documentUrls = await uploadFiles()

      const { error } = await supabase.from('drivers').upsert({
        id: profile.id,
        id_number: form.id_number,
        licence_number: form.licence_number,
        vehicle_registration: form.vehicle_registration,
        vehicle_description: form.vehicle_description,
        route_code: routeCode,
        verification_status: 'pending',
        documents_url: documentUrls,
      })
      if (error) throw error

      setStep(3)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (step === 3) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">Registration Submitted!</h2>
          <p className="text-sm text-text-secondary mb-6">
            Your documents are being reviewed. You'll be notified once approved.
          </p>
          <Button fullWidth onClick={() => navigate('/driver')}>Go to Dashboard</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary/20 to-emerald-100 rounded-2xl mb-4">
            <Car className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Driver Verification</h1>
          <p className="text-text-secondary text-sm mt-1">Complete your profile to start driving</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-danger bg-red-50 p-3 rounded-xl">{error}</p>}

          <Input label="SA ID Number" placeholder="13-digit ID number" value={form.id_number} onChange={e => updateForm('id_number', e.target.value)} maxLength={13} required />
          <Input label="Driver's Licence Number" placeholder="Your licence number" value={form.licence_number} onChange={e => updateForm('licence_number', e.target.value)} required />
          <Input label="Vehicle Registration" placeholder="e.g. ND 12345" value={form.vehicle_registration} onChange={e => updateForm('vehicle_registration', e.target.value)} required />
          <Input label="Vehicle Description" placeholder="e.g. White Toyota Quantum, 15-seater" value={form.vehicle_description} onChange={e => updateForm('vehicle_description', e.target.value)} required />

          {/* Document upload */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Upload Documents</label>
            <p className="text-xs text-text-secondary mb-2">Licence and vehicle registration photos (max 4 files, 5MB each)</p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            {files.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-2">
                {files.map((file, i) => (
                  <div key={i} className="relative bg-gray-50 rounded-xl p-2 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-text-secondary shrink-0" />
                    <span className="text-xs text-text-primary truncate">{file.name}</span>
                    <button type="button" onClick={() => removeFile(i)} className="absolute -top-1 -right-1 w-5 h-5 bg-danger text-white rounded-full flex items-center justify-center">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {files.length < 4 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/40 hover:bg-primary/5 transition"
              >
                <Upload className="h-5 w-5 text-text-muted mx-auto mb-1" />
                <p className="text-xs text-text-secondary">Tap to upload photos</p>
              </button>
            )}
          </div>

          <Button type="submit" fullWidth size="lg" loading={saving || uploading}>
            {uploading ? 'Uploading documents...' : 'Submit for Verification'}
          </Button>
        </form>
      </div>
    </div>
  )
}
