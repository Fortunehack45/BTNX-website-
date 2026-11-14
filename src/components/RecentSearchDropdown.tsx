import { Clock, ArrowUpLeft, X } from "lucide-react";

interface RecentSearchDropdownProps {
  queries: string[];
  onSelectQuery: (query: string) => void;
  onRemoveQuery: (query: string) => void;
  onClearAll: () => void;
}

export default function RecentSearchDropdown({
  queries,
  onSelectQuery,
  onRemoveQuery,
  onClearAll,
}: RecentSearchDropdownProps) {
  if (queries.length === 0) return null;

  return (
    <div
      role="listbox"
      aria-label="Recent searches"
      onMouseDown={(e) => e.preventDefault()}
      className="absolute left-0 right-0 top-full mt-2 m3-haze-surface border border-[#E6E2DA]/90 dark:border-[#2C2A26]/90 rounded-md z-50 overflow-hidden"
    >
      <div className="px-4 py-2.5 border-b border-[#E6E2DA]/80 dark:border-[#2C2A26]/80 bg-[#FAF9F7]/60 dark:bg-[#22211E]/60 flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#66625B] dark:text-[#A7A299]">
          Recent Searches
        </span>
        <button
          type="button"
          onClick={onClearAll}
          className="text-[11px] font-medium text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] underline cursor-pointer"
        >
          Clear
        </button>
      </div>

      <ul className="divide-y divide-[#E6E2DA] dark:divide-[#2C2A26]">
        {queries.map((item) => (
          <li key={item} className="flex items-center justify-between hover:bg-[#FAF9F7] dark:hover:bg-[#22211E] transition-colors">
            <button
              type="button"
              role="option"
              aria-selected={false}
              onClick={() => onSelectQuery(item)}
              className="flex-1 min-h-[44px] px-4 py-2.5 flex items-center gap-3 text-left text-sm text-[#141413] dark:text-[#F3F1EC] min-w-0 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-[#966830] dark:text-[#C89B62] shrink-0" />
              <span className="truncate flex-1">{item}</span>
              <ArrowUpLeft className="w-3.5 h-3.5 text-[#66625B] dark:text-[#A7A299] shrink-0" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveQuery(item);
              }}
              aria-label={`Remove "${item}" from recent searches`}
              className="min-w-[40px] min-h-[44px] flex items-center justify-center text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
