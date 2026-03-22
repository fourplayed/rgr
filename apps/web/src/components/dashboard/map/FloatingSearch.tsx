import { useState, useCallback } from "react"
import { IconSearch } from "@tabler/icons-react"

interface FloatingSearchProps {
  onSearch: (query: string) => void
}

export function FloatingSearch({ onSearch }: FloatingSearchProps) {
  const [query, setQuery] = useState("")

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    onSearch(query)
  }, [query, onSearch])

  return (
    <form
      onSubmit={handleSubmit}
      className="absolute top-3 left-3 z-10 flex items-center bg-card border border-border rounded-md shadow-md overflow-hidden"
    >
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          onSearch(e.target.value)
        }}
        placeholder="Search assets..."
        className="w-36 px-3 py-1.5 text-sm bg-transparent text-foreground placeholder:text-muted-foreground outline-none"
      />
      <button
        type="submit"
        className="w-7 h-7 flex items-center justify-center bg-primary rounded-sm m-0.5 flex-shrink-0"
      >
        <IconSearch size={14} className="text-primary-foreground" />
      </button>
    </form>
  )
}
