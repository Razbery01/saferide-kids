import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import Card, { CardTitle } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import { User, Car, CreditCard, Shield, Trash2, Copy, CheckCircle } from 'lucide-react'
import { SUBSCRIPTION_PRICES } from '../../lib/constants'

export default function DriverSettings() {
  const { profile, signOut } = useAuth()
  const [driverInfo, setDriverInfo] = useState(null)
  const [codeCopied, setCodeCopied] = useState(false)

  useEffect(() => {
    if (profile) {
      supabase.from('drivers').select('*').eq('id', profile.id).single()
        .then(({ data }) => setDriverInfo(data))
    }
  }, [profile])

  function copyCode() {
    navigator.clipboard.writeText(driverInfo?.route_code || '')
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle>Profile</CardTitle>
        <div className="flex items-center gap-3 mt-3">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-semibold">{profile?.full_name}</p>
            <p className="text-sm text-text-secondary">{profile?.email}</p>
            <Badge variant={driverInfo?.verification_status === 'approved' ? 'success' : 'warning'} className="mt-1">
              {driverInfo?.verification_status || 'pending'}
            </Badge>
          </div>
        </div>
      </Card>

      {driverInfo && (
        <>
          <Card>
            <CardTitle>Vehicle Details</CardTitle>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-text-secondary">Registration</span><span className="font-medium">{driverInfo.vehicle_registration}</span></div>
              <div className="flex justify-between"><span className="text-text-secondary">Description</span><span className="font-medium">{driverInfo.vehicle_description}</span></div>
            </div>
          </Card>

          <Card>
            <CardTitle>Route Code</CardTitle>
            <div className="flex items-center gap-3 mt-3">
              <span className="text-2xl font-bold text-primary tracking-widest">{driverInfo.route_code}</span>
              <button onClick={copyCode} className="p-2 rounded-lg hover:bg-gray-100 transition">
                {codeCopied ? <CheckCircle className="h-5 w-5 text-success" /> : <Copy className="h-5 w-5 text-text-secondary" />}
              </button>
            </div>
            <p className="text-xs text-text-secondary mt-1">Share this code with parents.</p>
          </Card>
        </>
      )}

      <Card>
        <CardTitle>Subscription</CardTitle>
        <div className="mt-3">
          <div className="p-3 rounded-xl border border-primary bg-primary/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Driver Pro</p>
                <p className="text-xs text-text-secondary">Full driver features</p>
              </div>
              <p className="font-bold text-primary">R{SUBSCRIPTION_PRICES.driver_pro.amount}/mo</p>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle>Privacy & Data</CardTitle>
        <div className="mt-3 space-y-2">
          <button className="w-full text-left text-sm p-2 rounded-lg hover:bg-gray-50 transition flex items-center gap-2">
            <Shield className="h-4 w-4 text-text-secondary" /> Privacy Policy & Terms
          </button>
          <button className="w-full text-left text-sm text-danger p-2 rounded-lg hover:bg-red-50 transition flex items-center gap-2">
            <Trash2 className="h-4 w-4" /> Request Account Deletion
          </button>
        </div>
      </Card>

      <Button variant="outline" fullWidth onClick={signOut}>Sign Out</Button>
    </div>
  )
}
