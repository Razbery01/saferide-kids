export default function Card({ children, className = '', padding = true, hover = false, ...props }) {
  return (
    <div
      className={`
        bg-white rounded-2xl
        ${padding ? 'p-4' : ''}
        ${hover ? 'card-hover cursor-pointer shadow-sm' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }) {
  return <div className={`mb-3 ${className}`}>{children}</div>
}

export function CardTitle({ children, className = '' }) {
  return <h3 className={`text-[15px] font-bold text-text-primary ${className}`}>{children}</h3>
}

export function CardDescription({ children, className = '' }) {
  return <p className={`text-sm text-text-secondary mt-0.5 ${className}`}>{children}</p>
}
