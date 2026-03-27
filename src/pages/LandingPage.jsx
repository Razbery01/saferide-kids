import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Shield, MapPin, Bell, MessageSquare, Gauge, Users,
  AlertTriangle, ChevronRight, CheckCircle, Lock, Eye,
  Star, ArrowRight, Zap, Heart, Menu, X, Smartphone, Download
} from 'lucide-react'
import Button from '../components/ui/Button'
import { usePWAInstall } from '../hooks/usePWAInstall'

function scrollToSection(e, id) {
  e.preventDefault()
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

const features = [
  { icon: MapPin, title: 'Live GPS Tracking', desc: 'Real-time vehicle tracking updated every 5 seconds so you always know where your child is.', color: 'bg-primary' },
  { icon: Bell, title: 'Instant Alerts', desc: 'Pickup, drop-off and school arrival notifications sent straight to your phone.', color: 'bg-blue-500' },
  { icon: MessageSquare, title: 'Secure Chat', desc: 'Message your driver directly through the app. No phone numbers shared.', color: 'bg-violet-500' },
  { icon: Gauge, title: 'Speed Alerts', desc: 'Set your own speed threshold and get notified if the driver exceeds it.', color: 'bg-orange-500' },
  { icon: Users, title: 'Multi-Child Support', desc: 'Track multiple children across different routes and drivers from one account.', color: 'bg-cyan-500' },
  { icon: AlertTriangle, title: 'Incident Reporting', desc: 'Drivers can report breakdowns, accidents or delays — you\'re informed instantly.', color: 'bg-red-500' },
]

const plans = [
  { name: 'Basic', price: '15', desc: 'Essential tracking', features: ['Live GPS tracking', 'Push notifications', 'Trip history', 'In-app messaging', 'Speed alerts'], highlighted: false },
  { name: 'Premium', price: '99', desc: 'Complete safety suite', features: ['Everything in Basic', 'Trip PDF export', 'Route replay', 'Priority support', 'Advanced analytics'], highlighted: true },
  { name: 'Driver Pro', price: '49', desc: 'For transport operators', features: ['Route management', 'Child check-in/out', 'Broadcast messaging', 'Trip logs', 'Incident reporting'], highlighted: false },
]

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { canInstall, install } = usePWAInstall()

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-black/5">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="SafeRide Kids" className="h-9 w-9 object-contain" />
            <span className="text-[17px] font-bold text-text-primary">SafeRide Kids</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <button onClick={(e) => scrollToSection(e, 'features')} className="text-sm text-text-secondary hover:text-text-primary transition font-medium">Features</button>
            <button onClick={(e) => scrollToSection(e, 'how-it-works')} className="text-sm text-text-secondary hover:text-text-primary transition font-medium">How It Works</button>
            <button onClick={(e) => scrollToSection(e, 'pricing')} className="text-sm text-text-secondary hover:text-text-primary transition font-medium">Pricing</button>
          </div>
          <div className="flex items-center gap-2">
            {canInstall && (
              <button onClick={install} className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition">
                <Download className="h-4 w-4" /> Install App
              </button>
            )}
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
            {canInstall && (
              <button onClick={() => { install(); setMenuOpen(false) }} className="block w-full text-left text-sm font-medium text-primary py-2 flex items-center gap-2">
                <Download className="h-4 w-4" /> Install App
              </button>
            )}
            <div className="flex gap-2 pt-2 border-t border-black/5">
              <Link to="/login" className="flex-1"><Button variant="outline" size="sm" fullWidth>Sign In</Button></Link>
              <Link to="/register" className="flex-1"><Button size="sm" fullWidth rounded>Get Started</Button></Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="pt-16 pb-20 sm:pt-20 sm:pb-28 px-5">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span className="text-xs font-semibold text-primary">Now available across South Africa</span>
            </div>
            <h1 className="text-[36px] sm:text-[48px] lg:text-[52px] font-extrabold text-text-primary leading-[1.08] tracking-tight">
              Track Every Trip.<br /><span className="gradient-text">Trust Every Ride.</span>
            </h1>
            <p className="mt-5 text-lg text-text-secondary max-w-lg leading-relaxed">
              Real-time GPS tracking, instant alerts, and direct driver communication — purpose-built for South African school transport.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register">
                <Button size="xl" rounded>Start Free Trial <ArrowRight className="h-4.5 w-4.5" /></Button>
              </Link>
              <Button variant="outline" size="xl" rounded onClick={(e) => scrollToSection(e, 'how-it-works')}>How It Works</Button>
            </div>
            <p className="mt-4 text-sm text-text-secondary">7-day free trial &middot; No credit card needed</p>
          </div>

          {/* App preview card */}
          <div className="lg:flex lg:justify-end">
            <div className="w-full max-w-sm mx-auto lg:mx-0">
              <div className="bg-white rounded-3xl p-5 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)] border border-black/5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-text-primary">Morning Route — Westville</p>
                    <p className="text-xs text-text-secondary">Driver: John M. &middot; 6 children</p>
                  </div>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                  </span>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-background rounded-2xl h-36 flex items-center justify-center mb-4 relative overflow-hidden">
                  {/* Simulated map UI */}
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-4 left-6 w-20 h-0.5 bg-primary rounded" />
                    <div className="absolute top-4 left-[104px] w-12 h-0.5 bg-primary rounded rotate-45 origin-left" />
                    <div className="absolute top-[38px] left-[138px] w-16 h-0.5 bg-primary rounded" />
                  </div>
                  <div className="text-center relative">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mx-auto mb-1.5 shadow-lg shadow-primary/30">
                      <Smartphone className="h-5 w-5 text-white" />
                    </div>
                    <p className="text-xs font-bold text-primary">Live Tracking</p>
                    <p className="text-[10px] text-text-secondary mt-0.5">Updated 3s ago</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 p-2.5 bg-emerald-50 rounded-xl">
                    <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-xs font-semibold text-emerald-800">Sarah picked up at 7:05 AM</span>
                  </div>
                  <div className="flex items-center gap-2.5 p-2.5 bg-blue-50 rounded-xl">
                    <Bell className="h-4 w-4 text-blue-500 shrink-0" />
                    <span className="text-xs font-semibold text-blue-800">Arriving at school in 5 min</span>
                  </div>
                  <div className="flex items-center gap-2.5 p-2.5 bg-orange-50 rounded-xl">
                    <Gauge className="h-4 w-4 text-orange-500 shrink-0" />
                    <span className="text-xs font-semibold text-orange-800">Speed: 52 km/h — within limit</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-background px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-bold text-primary uppercase tracking-wider mb-2">Features</p>
            <h2 className="text-[28px] sm:text-[36px] font-bold text-text-primary tracking-tight">Everything for peace of mind</h2>
            <p className="text-text-secondary mt-2 max-w-lg mx-auto">Built specifically for the safety needs of South African school transport.</p>
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
          <div className="text-center mb-12">
            <p className="text-sm font-bold text-primary uppercase tracking-wider mb-2">How It Works</p>
            <h2 className="text-[28px] sm:text-[36px] font-bold text-text-primary tracking-tight">Get started in under 2 minutes</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { n: '1', icon: Smartphone, title: 'Create your account', desc: 'Sign up as a parent or driver. Add your children and their school details.' },
              { n: '2', icon: Zap, title: 'Link to your driver', desc: 'Enter the 6-character code from your child\'s transport driver to connect.' },
              { n: '3', icon: Heart, title: 'Track every trip', desc: 'Get real-time GPS tracking, speed alerts, and instant notifications.' },
            ].map((step, i) => {
              const Icon = step.icon
              return (
                <div key={step.n} className="text-center">
                  <div className="relative inline-flex mb-4">
                    <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center">
                      <Icon className="h-6 w-6 text-white" strokeWidth={2} />
                    </div>
                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-accent text-white text-xs font-bold rounded-full flex items-center justify-center">{step.n}</span>
                  </div>
                  {i < 2 && <div className="hidden sm:block absolute" />}
                  <h3 className="text-[15px] font-bold text-text-primary mb-1">{step.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{step.desc}</p>
                </div>
              )
            })}
          </div>
          <div className="mt-10 text-center">
            <Link to="/register"><Button size="lg" rounded>Get Started Free <ChevronRight className="h-4 w-4" /></Button></Link>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-background px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-bold text-primary uppercase tracking-wider mb-2">Pricing</p>
            <h2 className="text-[28px] sm:text-[36px] font-bold text-text-primary tracking-tight">Simple, fair pricing</h2>
            <p className="text-text-secondary mt-2">7-day free trial on all plans. No credit card needed.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto items-stretch">
            {plans.map(plan => (
              <div key={plan.name} className={`rounded-2xl p-6 flex flex-col ${
                plan.highlighted
                  ? 'bg-accent text-white ring-2 ring-primary shadow-xl'
                  : 'bg-white'
              }`}>
                {plan.highlighted && (
                  <span className="inline-flex self-start items-center px-2.5 py-1 bg-primary rounded-lg text-[10px] font-bold text-white uppercase tracking-wider mb-3">
                    <Star className="h-3 w-3 mr-1" /> Most Popular
                  </span>
                )}
                <h3 className={`text-lg font-bold ${plan.highlighted ? 'text-white' : 'text-text-primary'}`}>{plan.name}</h3>
                <p className={`text-sm ${plan.highlighted ? 'text-white/70' : 'text-text-secondary'}`}>{plan.desc}</p>
                <div className="mt-4 mb-5">
                  <span className={`text-[36px] font-bold tracking-tight ${plan.highlighted ? 'text-white' : 'text-text-primary'}`}>R{plan.price}</span>
                  <span className={`text-sm ${plan.highlighted ? 'text-white/70' : 'text-text-secondary'}`}>/mo</span>
                </div>
                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle className={`h-4 w-4 shrink-0 ${plan.highlighted ? 'text-primary' : 'text-primary'}`} />
                      <span className={plan.highlighted ? 'text-white/90' : 'text-text-primary'}>{f}</span>
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
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full translate-y-1/3 -translate-x-1/4" />
            <div className="relative max-w-2xl mx-auto text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">Your family's safety comes first</h2>
              <p className="text-white/70 text-base mb-10">Fully POPIA compliant. Encrypted data. No third-party sharing.</p>
              <div className="grid sm:grid-cols-3 gap-8">
                {[
                  { icon: Lock, title: 'Encrypted', desc: 'End-to-end data encryption' },
                  { icon: Shield, title: 'POPIA Compliant', desc: 'Full South African compliance' },
                  { icon: Eye, title: 'Your Data', desc: 'Download or delete anytime' },
                ].map(item => {
                  const Icon = item.icon
                  return (
                    <div key={item.title}>
                      <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <p className="font-bold text-white text-sm">{item.title}</p>
                      <p className="text-sm text-white/60 mt-0.5">{item.desc}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Download App */}
      <section className="py-16 bg-white px-5">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-br from-primary/5 to-emerald-50 rounded-3xl p-8 sm:p-12 flex flex-col sm:flex-row items-center gap-8">
            <div className="shrink-0">
              <img src="/icons/icon-192x192.png" alt="SafeRide Kids App" className="w-24 h-24 rounded-3xl shadow-lg" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-2xl font-bold text-text-primary tracking-tight">Get the SafeRide Kids app</h2>
              <p className="text-text-secondary mt-2 max-w-md">Install SafeRide Kids on your phone for instant access to GPS tracking, push notifications, and offline support. No app store needed.</p>
            </div>
            <div className="shrink-0 flex flex-col gap-2">
              {canInstall ? (
                <Button size="lg" rounded onClick={install}>
                  <Download className="h-5 w-5" /> Install Now
                </Button>
              ) : (
                <Link to="/register">
                  <Button size="lg" rounded>
                    <ArrowRight className="h-5 w-5" /> Get Started
                  </Button>
                </Link>
              )}
              <p className="text-xs text-text-muted text-center">Works on Android &amp; iOS</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-background px-5">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-[28px] sm:text-[36px] font-bold text-text-primary tracking-tight">Ready to ride safe?</h2>
          <p className="text-text-secondary mt-3 mb-8">Join parents and drivers across South Africa who trust SafeRide Kids.</p>
          <Link to="/register"><Button size="xl" rounded>Get Started Free <ArrowRight className="h-5 w-5" /></Button></Link>
          <p className="mt-3 text-sm text-text-secondary">7-day free trial &middot; No credit card needed</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-accent text-white py-12 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-4 gap-10">
            <div className="sm:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <img src="/logo.png" alt="SafeRide Kids" className="h-9 w-9 object-contain brightness-0 invert" />
                <span className="font-bold text-lg">SafeRide Kids</span>
              </div>
              <p className="text-sm text-white/60 max-w-xs leading-relaxed">Safer school transport for every South African child. Built by KelyRa Tech (Pty) Ltd.</p>
              <p className="text-sm text-white/40 mt-2">Durban, KwaZulu-Natal</p>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-white/60">
                <li><button onClick={(e) => scrollToSection(e, 'features')} className="hover:text-white transition">Features</button></li>
                <li><button onClick={(e) => scrollToSection(e, 'pricing')} className="hover:text-white transition">Pricing</button></li>
                <li><button onClick={(e) => scrollToSection(e, 'how-it-works')} className="hover:text-white transition">How It Works</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-white/60">
                <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms & Conditions</a></li>
                <li><a href="mailto:privacy@kelyratech.co.za" className="hover:text-white transition">privacy@kelyratech.co.za</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-10 pt-8 text-center text-xs text-white/40">
            &copy; {new Date().getFullYear()} KelyRa Tech (Pty) Ltd. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
