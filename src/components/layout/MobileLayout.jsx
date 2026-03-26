import { Outlet } from 'react-router-dom'
import MobileHeader from './MobileHeader'
import MobileNav from './MobileNav'

export default function MobileLayout({ title }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileHeader title={title} />
      <main className="flex-1 pb-20 max-w-lg mx-auto w-full px-4 py-4">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  )
}
