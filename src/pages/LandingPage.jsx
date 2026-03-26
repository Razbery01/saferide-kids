import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Shield, MapPin, Bell, MessageSquare, Gauge, Users,
  AlertTriangle, ChevronRight, CheckCircle, Lock, Eye,
  Star, ArrowRight, Zap, Heart, Menu, X, Globe, Smartphone
} from 'lucide-react'
import Button from '../components/ui/Button'

function scrollToSection(e, id) {
  e.preventDefault()
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

const features = [
  { icon: MapPin, title: 'Live GPS Tracking', desc: 'Real-time vehicle tracking updated every 5 seconds.', color: 'bg-primary' },
  { icon: Bell, title: 'Instant Alerts', desc: 'Pickup, drop-off and arrival notifications in seconds.', color: 'bg-blue-500' },
  { icon: MessageSquare, title: 'Secure Chat', desc: 'Message your driver directly. No numbers shared.', color: 'bg-violet-500' },
  { icon: Gauge, title: 'Speed Alerts', desc: 'Get notified if the driver exceeds your speed limit.', color: 'bg-orange-500' },
  { icon: Users, title: 'Multi-Child', desc: 'Track multiple children across different routes.', color: 'bg-cyan-500' },
  { icon: AlertTriangle, title: 'SOS Button', desc: 'One-tap emergency alert to your contacts.', color: 'bg-red-500' },
]

const plans = [
  { name: 'Basic', price: '15', desc: 'Essential tracking', features: ['Live GPS tracking', 'Push notifications', 'Trip history', 'In-app messaging', 'Speed alerts'], highlighted: false },
  { name: 'Premium', price: '99', desc: 'Complete safety', features: ['Everything in Basic', 'Trip PDF export', 'Route replay', 'Priority support', 'Advanced analytics'], highlighted: true },
  { name: 'Driver Pro', price: '49', desc: 'For operators', features: ['Route management', 'Child check-in/out', 'Broadcast messaging', 'Trip logs', 'Incident reporting'], highlighted: false },
]

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-black/5">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="SafeRide Kids" className="h-[72px] w-auto" />
            <span className="text-[17px] font-bold text-text-primary">SafeRide Kids</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <button onClick={(e) => scrollToSection(e, 'features')} className="text-sm text-text-secondary hover:text-text-primary transition font-medium">Features</button>
            <button onClick={(e) => scrollToSection(e, 'how-it-works')} className="text-sm text-text-secondary hover:text-text-primary transition font-medium">How It Works</button>
            <button onClick={(e) => scrollToSection(e, 'pricing')} className="text-sm text-text-secondary hover:text-text-primary transition font-medium">Pricing</button>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden sm:block"><Button variant="ghost" size="sm">Sign In</Button></Link>
            <Link to="/register" className="hidden sm:block"><Button size="sm" rounded>Get Started</Button></Link>
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center hover:bg-black/5">
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-black/5 px-5 py-4 space-y-3 slide-up">
            <button onClick={(e) => { scrollToSection(e, 'features'); setMenuOpen(false) }} className="block w-full text-left text-sm font-medium text-text-secondary py-2">Features</button>
            <button onClick={(e) => { scrollToSection(e, 'how-it-works'); setMenuOpen(false) }} className="block w-full text-left text-sm font-medium text-text-secondary py-2">How It Works</button>
            <button onClick={(e) => { scrollToSection(e, 'pricing'); setMenuOpen(false) }} className="block w-full text-left text-sm font-medium text-text-secondary py-2">Pricing</button>
            <div className="flex gap-2 pt-2 border-t border-black/5">
              <Link to="/login" className="flex-1"><Button variant="outline" size="sm" fullWidth>Sign In</Button></Link>
              <Link to="/register" className="flex-1"><Button size="sm" fullWidth rounded>Get Started</Button></Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="pt-16 pb-20 sm:pt-24 sm:pb-28 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl">
            <h1 className="text-[40px] sm:text-[52px] font-bold text-text-primary leading-[1.08] tracking-tight">
              Track Every Trip.<br /><span className="text-primary">Trust Every Ride.</span>
            </h1>
            <p className="mt-5 text-lg text-text-secondary max-w-lg leading-relaxed">
              Real-time GPS tracking, instant alerts, and direct driver communication — built for South African families.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register">
                <Button size="xl" rounded>Start Free Trial <ArrowRight className="h-4.5 w-4.5" /></Button>
              </Link>
              <Button variant="outline" size="xl" rounded onClick={(e) => scrollToSection(e, 'how-it-works')}>How It Works</Button>
            </div>
            <p className="mt-4 text-sm text-text-muted">7-day free trial · No credit card needed</p>
          </div>

          {/* App preview card */}
          <div className="mt-14 max-w-sm sm:max-w-md">
            <div className="bg-white rounded-3xl p-5 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)] border border-black/5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-text-primary">Morning Route — Westville</p>
                  <p className="text-xs text-text-secondary">Driver: John M.</p>
                </div>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                </span>
              </div>
              <div className="bg-background rounded-2xl h-32 flex items-center justify-center mb-4">
                <div className="text-center">
                  <Smartphone className="h-6 w-6 text-text-muted mx-auto mb-1" />
                  <p className="text-xs font-medium text-text-muted">Live Map</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 p-2.5 bg-emerald-50 rounded-xl">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-emerald-800">Sarah picked up at 7:05 AM</span>
                </div>
                <div className="flex items-center gap-2.5 p-2.5 bg-blue-50 rounded-xl">
                  <Bell className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-semibold text-blue-800">Arriving at school in 5 min</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-background px-5">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <p className="text-sm font-bold text-primary uppercase tracking-wider mb-2">Features</p>
            <h2 className="text-[28px] sm:text-[36px] font-bold text-text-primary tracking-tight">Everything for peace of mind</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map(f => {
              const Icon = f.icon
              return (
                <div key={f.title} className="bg-white rounded-2xl p-5 card-hover">
                  <div className={`w-11 h-11 ${f.color} rounded-xl flex items-center justify-center mb-3.5`}>
                    <Icon className="h-5 w-5 text-white" strokeWidth={2} />
                  </div>
                  <h3 className="text-[15px] font-bold text-text-primary mb-1">{f.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-white px-5">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <p className="text-sm font-bold text-primary uppercase tracking-wider mb-2">How It Works</p>
            <h2 className="text-[28px] sm:text-[36px] font-bold text-text-primary tracking-tight">Start in under 2 minutes</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-8 max-w-3xl">
            {[
              { n: '1', icon: Smartphone, title: 'Create account', desc: 'Sign up, add your children and their school details.' },
              { n: '2', icon: Zap, title: 'Link to driver', desc: 'Enter the 6-digit code from your child\'s transport driver.' },
              { n: '3', icon: Heart, title: 'Track every trip', desc: 'Get real-time GPS tracking and instant alerts.' },
            ].map(step => {
              const Icon = step.icon
              return (
                <div key={step.n}>
                  <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5 text-white" strokeWidth={2} />
                  </div>
                  <h3 className="text-[15px] font-bold text-text-primary mb-1">{step.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{step.desc}</p>
                </div>
              )
            })}
          </div>
          <div className="mt-10">
            <Link to="/register"><Button size="lg" rounded>Get Started Free <ChevronRight className="h-4 w-4" /></Button></Link>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-background px-5">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <p className="text-sm font-bold text-primary uppercase tracking-wider mb-2">Pricing</p>
            <h2 className="text-[28px] sm:text-[36px] font-bold text-text-primary tracking-tight">Simple, fair pricing</h2>
            <p className="text-text-secondary mt-2">7-day free trial on all plans. No credit card needed.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 max-w-4xl items-start">
            {plans.map(plan => (
              <div key={plan.name} className={`rounded-2xl p-5 flex flex-col ${
                plan.highlighted
                  ? 'bg-accent text-white sm:scale-[1.03] shadow-xl shadow-accent/20'
                  : 'bg-white'
              }`}>
                {plan.highlighted && (
                  <span className="inline-flex self-start items-center px-2.5 py-1 bg-primary rounded-lg text-[10px] font-bold text-white uppercase tracking-wider mb-3">
                    <Star className="h-3 w-3 mr-1" /> Popular
                  </span>
                )}
                <h3 className={`text-lg font-bold ${plan.highlighted ? 'text-white' : 'text-text-primary'}`}>{plan.name}</h3>
                <p className={`text-sm ${plan.highlighted ? 'text-white/50' : 'text-text-secondary'}`}>{plan.desc}</p>
                <div className="mt-4 mb-5">
                  <span className={`text-[36px] font-bold tracking-tight ${plan.highlighted ? 'text-white' : 'text-text-primary'}`}>R{plan.price}</span>
                  <span className={`text-sm ${plan.highlighted ? 'text-white/50' : 'text-text-secondary'}`}>/mo</span>
                </div>
                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle className={`h-4 w-4 shrink-0 ${plan.highlighted ? 'text-primary' : 'text-primary'}`} />
                      <span className={plan.highlighted ? 'text-white/80' : 'text-text-primary'}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/register">
                  <Button variant={plan.highlighted ? 'primary' : 'outline'} fullWidth size="lg" rounded>
                    Start Free Trial
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="py-20 bg-white px-5">
        <div className="max-w-6xl mx-auto">
          <div className="bg-accent rounded-3xl p-8 sm:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/3" />
            <div className="relative max-w-2xl mx-auto text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">Your family's safety first</h2>
              <p className="text-white/50 text-base mb-10">Fully POPIA compliant. Encrypted. No data sharing.</p>
              <div className="grid sm:grid-cols-3 gap-6">
                {[
                  { icon: Lock, title: 'AES-256', desc: 'End-to-end encryption' },
                  { icon: Shield, title: 'POPIA', desc: 'Full SA compliance' },
                  { icon: Eye, title: 'Your Data', desc: 'Download or delete anytime' },
                ].map(item => {
                  const Icon = item.icon
                  return (
                    <div key={item.title}>
                      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-2.5">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <p className="font-bold text-white text-sm">{item.title}</p>
                      <p className="text-xs text-white/40 mt-0.5">{item.desc}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-background px-5">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-[28px] sm:text-[36px] font-bold text-text-primary tracking-tight">Ready to start?</h2>
          <p className="text-text-secondary mt-3 mb-8">Join parents across South Africa using SafeRide Kids.</p>
          <Link to="/register"><Button size="xl" rounded>Get Started Free <ArrowRight className="h-5 w-5" /></Button></Link>
          <p className="mt-3 text-sm text-text-muted">7-day free trial · No credit card</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-accent text-white py-12 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-4 gap-10">
            <div className="sm:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <img src="/logo.png" alt="SafeRide Kids" className="h-20 w-auto brightness-0 invert" />
                <span className="font-bold">SafeRide Kids</span>
              </div>
              <p className="text-sm text-white/40 max-w-xs leading-relaxed">Safer school transport for every South African child. By KelyRa Tech (Pty) Ltd.</p>
              <p className="text-sm text-white/30 mt-1">Durban, KwaZulu-Natal</p>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-white/40">
                <li><button onClick={(e) => scrollToSection(e, 'features')} className="hover:text-white transition">Features</button></li>
                <li><button onClick={(e) => scrollToSection(e, 'pricing')} className="hover:text-white transition">Pricing</button></li>
                <li><button onClick={(e) => scrollToSection(e, 'how-it-works')} className="hover:text-white transition">How It Works</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-white/40">
                <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms & Conditions</a></li>
                <li><a href="mailto:privacy@kelyratech.co.za" className="hover:text-white transition">privacy@kelyratech.co.za</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/5 mt-10 pt-8 text-center text-xs text-white/25">
            &copy; {new Date().getFullYear()} KelyRa Tech (Pty) Ltd
          </div>
        </div>
      </footer>
    </div>
  )
}
