import { Shield } from 'lucide-react'

export default function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'h-5 w-5', md: 'h-8 w-8', lg: 'h-12 w-12' }
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`${sizes[size]} relative`}>
        <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
      </div>
    </div>
  )
}

export function FullPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="relative inline-flex">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-emerald-400 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <div className="absolute -inset-1 bg-gradient-to-br from-primary to-emerald-400 rounded-2xl opacity-20 blur-lg animate-pulse" />
        </div>
        <p className="mt-5 text-sm font-medium text-text-secondary tracking-wide">Loading SafeRide Kids...</p>
      </div>
    </div>
  )
}
