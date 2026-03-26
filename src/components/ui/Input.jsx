import { forwardRef, useId } from 'react'

const Input = forwardRef(({ label, error, icon: Icon, id, name, className = '', ...props }, ref) => {
  const autoId = useId()
  const inputId = id || name || autoId

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-text-primary tracking-tight">{label}</label>
      )}
      <div className="relative group">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Icon className="h-[18px] w-[18px] text-text-muted group-focus-within:text-primary transition-colors" />
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          name={name || inputId}
          className={`
            w-full rounded-xl border border-border/80 bg-white px-4 py-3
            text-sm text-text-primary placeholder:text-text-muted
            focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
            transition-all duration-200
            hover:border-gray-300
            ${Icon ? 'pl-11' : ''}
            ${error ? 'border-danger/60 focus:ring-danger/20 focus:border-danger' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-danger font-medium">{error}</p>}
    </div>
  )
})

Input.displayName = 'Input'
export default Input
