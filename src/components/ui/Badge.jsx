const variants = {
  success: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  danger: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  info: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  neutral: 'bg-gray-50 text-gray-600 ring-1 ring-gray-200',
  primary: 'bg-primary/10 text-primary ring-1 ring-primary/20',
  accent: 'bg-accent/10 text-accent ring-1 ring-accent/20',
}

export default function Badge({ children, variant = 'neutral', className = '', dot = false }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold tracking-wide uppercase ${variants[variant]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${
        variant === 'success' ? 'bg-emerald-500' :
        variant === 'warning' ? 'bg-amber-500' :
        variant === 'danger' ? 'bg-red-500' :
        variant === 'info' ? 'bg-blue-500' :
        'bg-gray-400'
      }`} />}
      {children}
    </span>
  )
}
