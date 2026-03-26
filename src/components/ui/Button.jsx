const variants = {
  primary: 'bg-primary text-white hover:bg-primary-dark active:scale-[0.97] shadow-sm shadow-primary/20',
  secondary: 'bg-secondary text-white hover:brightness-110 active:scale-[0.97] shadow-sm shadow-secondary/20',
  danger: 'bg-danger text-white hover:brightness-110 active:scale-[0.97]',
  accent: 'bg-accent text-white hover:bg-accent-light active:scale-[0.97]',
  outline: 'border border-border text-text-primary bg-white hover:bg-gray-50 active:scale-[0.97]',
  ghost: 'text-text-secondary hover:bg-black/5 active:scale-[0.97]',
  pill: 'bg-primary/10 text-primary hover:bg-primary/15 active:scale-[0.97]',
}

const sizes = {
  xs: 'px-3 py-1.5 text-xs',
  sm: 'px-4 py-2 text-[13px]',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3.5 text-[15px]',
  xl: 'px-8 py-4 text-base',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  fullWidth = false,
  rounded = false,
  ...props
}) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 font-semibold
        transition-all duration-150 ease-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2
        disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none
        ${rounded ? 'rounded-full' : 'rounded-xl'}
        ${variants[variant]} ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
}
