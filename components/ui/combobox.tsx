import * as React from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ComboboxProps {
  options: Array<{ value: string; label: string }>
  value?: string
  onValueChange: (value: string | undefined) => void
  onSearchChange?: (search: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
  disabled?: boolean
  loading?: boolean
}

export function Combobox({
  options,
  value,
  onValueChange,
  onSearchChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  className,
  disabled,
  loading,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')

  const selectedOption = options.find((option) => option.value === value)

  // Don't filter client-side - server handles filtering
  // This prevents double filtering and ensures consistency
  const filteredOptions = React.useMemo(() => {
    return options
  }, [options])

  // Notify parent of search changes (debounced to avoid excessive calls)
  React.useEffect(() => {
    if (onSearchChange && open) {
      const timeoutId = setTimeout(() => {
        onSearchChange(search)
      }, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [search, onSearchChange, open])

  // Reset search when popover closes
  React.useEffect(() => {
    if (!open) {
      setSearch('')
      if (onSearchChange) {
        onSearchChange('')
      }
    }
  }, [open, onSearchChange])

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            open && "ring-2 ring-ring ring-offset-2",
            className
          )}
          disabled={disabled}
        >
          <span className="truncate text-left">
            {selectedOption ? (
              <span className="font-medium">{selectedOption.label}</span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          {loading ? (
            <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0 shadow-lg border-border/50 z-[200]" 
        align="start"
        sideOffset={4}
        onInteractOutside={(e) => {
          // Prevent closing when clicking inside the parent dropdown menu or command components
          const target = e.target as HTMLElement
          if (
            target.closest('[role="menu"]') ||
            target.closest('[data-radix-dropdown-menu-content]') ||
            target.closest('[data-radix-dropdown-menu-portal]') ||
            target.closest('[cmdk-item]') ||
            target.closest('[cmdk-list]') ||
            target.closest('[cmdk-input-wrapper]')
          ) {
            e.preventDefault()
          }
        }}
      >
        <Command>
          <CommandInput 
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={(val) => {
              setSearch(val)
              if (onSearchChange) {
                onSearchChange(val)
              }
            }}
          />
          <CommandList>
            {loading && options.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                Loading...
              </div>
            ) : (
              <CommandEmpty>{emptyMessage}</CommandEmpty>
            )}
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  onValueChange(undefined)
                  setOpen(false)
                  setSearch('')
                  if (onSearchChange) {
                    onSearchChange('')
                  }
                }}
                className={cn(
                  !value && "bg-accent/50 font-medium"
                )}
              >
                <Check
                  className={cn(
                    "mr-2.5 h-4 w-4 shrink-0 transition-opacity",
                    !value ? "opacity-100 text-primary" : "opacity-0"
                  )}
                />
                <span className={cn(!value && "font-medium")}>All</span>
              </CommandItem>
              {filteredOptions.length === 0 && search ? (
                <div className="py-8 text-center text-sm text-muted-foreground px-3">
                  {emptyMessage}
                </div>
              ) : filteredOptions.length > 0 ? (
                filteredOptions.map((option) => {
                  const isSelected = value === option.value
                  return (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={(currentValue) => {
                        // Toggle selection: if already selected, deselect; otherwise select
                        const newValue = currentValue === value ? undefined : currentValue
                        onValueChange(newValue)
                        setOpen(false)
                        setSearch('')
                        if (onSearchChange) {
                          onSearchChange('')
                        }
                      }}
                      className={cn(
                        isSelected && "bg-accent/50 font-medium"
                      )}
                    >
                      <Check
                        className={cn(
                          "mr-2.5 h-4 w-4 shrink-0 transition-opacity",
                          isSelected ? "opacity-100 text-primary" : "opacity-0"
                        )}
                      />
                      <span className={cn(isSelected && "font-medium")}>{option.label}</span>
                    </CommandItem>
                  )
                })
              ) : null}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}


