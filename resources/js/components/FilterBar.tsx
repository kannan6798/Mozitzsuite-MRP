import { cn } from "@/lib/utils";

interface FilterBarProps {
  filters: string[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  className?: string;
}

const FilterBar = ({ filters, activeFilter, onFilterChange, className }: FilterBarProps) => {
  return (
    <div className={cn("bg-background border-b border-border", className)}>
      <div className="flex items-center gap-2 px-6 py-4">
        {filters.map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <button
              key={filter}
              onClick={() => onFilterChange(filter)}
              className={cn(
                "px-6 py-2 text-sm font-medium rounded transition-all",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {filter}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FilterBar;
