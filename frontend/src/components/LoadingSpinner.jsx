import clsx from 'clsx'

const SIZE_MAP = {
  sm: 'w-4 h-4 border-2',
  md: 'w-7 h-7 border-2',
  lg: 'w-12 h-12 border-3',
}

export default function LoadingSpinner({ size = 'md', className }) {
  return (
    <div
      className={clsx(
        'animate-spin rounded-full border-gray-200 border-t-blue-600',
        SIZE_MAP[size] ?? SIZE_MAP.md,
        className
      )}
    />
  )
}
