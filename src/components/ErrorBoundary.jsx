import { Component } from 'react'
import Button from './ui/Button'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught:', error, errorInfo)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-5">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <span className="text-2xl">!</span>
            </div>
            <h1 className="text-xl font-bold text-text-primary mb-2">Something went wrong</h1>
            <p className="text-sm text-text-secondary mb-6">
              An unexpected error occurred. Please refresh the page to try again.
            </p>
            <Button onClick={() => window.location.reload()} fullWidth>
              Refresh Page
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
