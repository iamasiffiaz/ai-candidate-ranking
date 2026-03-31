import { useRef, useState } from 'react'
import { FileText, Upload, X } from 'lucide-react'
import clsx from 'clsx'

/**
 * Drag-and-drop + click-to-browse PDF upload zone.
 * Calls onFilesSelected whenever the selection changes.
 */
export default function FileUpload({ onFilesSelected, maxFiles = 20 }) {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState([])
  const inputRef = useRef(null)

  const mergeFiles = (incoming) => {
    const pdfs = Array.from(incoming).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    )
    const merged = [...files, ...pdfs].slice(0, maxFiles)
    setFiles(merged)
    onFilesSelected?.(merged)
  }

  const removeFile = (idx) => {
    const updated = files.filter((_, i) => i !== idx)
    setFiles(updated)
    onFilesSelected?.(updated)
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          mergeFiles(e.dataTransfer.files)
        }}
        className={clsx(
          'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer select-none transition-all duration-200',
          isDragging
            ? 'border-blue-500 bg-blue-50 scale-[1.01]'
            : 'border-gray-300 hover:border-blue-400 hover:bg-slate-50'
        )}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center">
            <Upload className="w-7 h-7 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-700">
              {isDragging ? 'Drop files here' : 'Drag & drop PDF resumes'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              or <span className="text-blue-600 underline">browse files</span> — max{' '}
              {maxFiles} PDFs
            </p>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => mergeFiles(e.target.files)}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {files.length} file{files.length !== 1 ? 's' : ''} selected
          </p>
          {files.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5"
            >
              <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span className="text-sm text-gray-700 flex-1 truncate">{file.name}</span>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {(file.size / 1024).toFixed(0)} KB
              </span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="text-gray-300 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
