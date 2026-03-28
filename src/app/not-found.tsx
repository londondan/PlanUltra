import Link from 'next/link'
import { buttonVariants } from '@/lib/button-variants'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center gap-4">
      <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
      <h2 className="text-2xl font-semibold">Page not found</h2>
      <p className="text-muted-foreground max-w-sm">
        This page doesn&apos;t exist or has been moved.
      </p>
      <Link href="/" className={buttonVariants()}>Go home</Link>
    </div>
  )
}
