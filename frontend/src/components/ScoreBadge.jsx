import clsx from 'clsx'

/**
 * Renders a colour-coded progress bar + percentage for a similarity score (0-1).
 */
export default function ScoreBadge({ score, showBar = true }) {
  if (score == null) {
    return <span className="text-xs text-gray-400 italic">Not ranked</span>
  }

  const pct = Math.round(score * 100)
  const colorClass =
    pct >= 70 ? 'bg-emerald-500' : pct >= 45 ? 'bg-amber-400' : 'bg-red-400'
  const textClass =
    pct >= 70 ? 'text-emerald-600' : pct >= 45 ? 'text-amber-600' : 'text-red-500'

  return (
    <div className="flex items-center gap-2">
      {showBar && (
        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={clsx('h-full rounded-full transition-all duration-300', colorClass)}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      <span className={clsx('text-sm font-bold tabular-nums', textClass)}>{pct}%</span>
    </div>
  )
}
