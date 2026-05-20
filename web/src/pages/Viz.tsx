export function VizPage() {
  return (
    <div className="space-y-4 -m-6">
      <p className="px-6 text-sm text-muted-foreground">
        Architecture and images visualizers (legacy static pages).
      </p>
      <iframe
        title="Architecture"
        src="/architecture.html"
        className="w-full border-0"
        style={{ height: 'calc(100vh - 120px)' }}
      />
    </div>
  )
}
