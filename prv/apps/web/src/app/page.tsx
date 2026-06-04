export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-screen bg-black">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center">
          <span className="text-white text-2xl font-semibold">P</span>
        </div>
        <h1 className="text-white/95 text-2xl font-semibold tracking-tight">PRV</h1>
        <p className="text-white/40 text-sm">Company Operating System</p>
      </div>
    </div>
  )
}
