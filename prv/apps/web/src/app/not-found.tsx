import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-screen bg-black">
      <div className="flex flex-col items-center gap-6 text-center px-6">
        <p className="text-white/20 text-xs font-mono uppercase tracking-widest">404</p>
        <h2 className="text-white/95 text-xl font-semibold">Page not found</h2>
        <p className="text-white/40 text-sm max-w-xs">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="mt-2 px-5 py-2.5 rounded-full bg-white/10 border border-white/20 text-white/80 text-sm backdrop-blur-xl transition-colors hover:bg-white/15 active:bg-white/20"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
