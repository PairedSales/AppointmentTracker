import React from 'react';
import { Trash2, Search } from 'lucide-react';

interface ToolbarProps {
  selectedRowIds: string[];
  isHistorical: boolean;
  handlePaintRowsColor: (color: string) => void;
  handleBulkDelete: () => void;
  setSelectedRowIds: React.Dispatch<React.SetStateAction<string[]>>;
  setLastSelectedId: React.Dispatch<React.SetStateAction<string | null>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  colorFilter: string;
  setColorFilter: React.Dispatch<React.SetStateAction<string>>;
}

export default function Toolbar({
  selectedRowIds,
  isHistorical,
  handlePaintRowsColor,
  handleBulkDelete,
  setSelectedRowIds,
  setLastSelectedId,
  searchQuery,
  setSearchQuery,
  colorFilter,
  setColorFilter,
}: ToolbarProps) {
  return (
    <section className="flex justify-between items-center flex-wrap gap-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] px-4 rounded-[10px] h-[58px] max-md:h-auto max-md:py-3 max-md:px-4">
      {selectedRowIds.length > 0 && !isHistorical ? (
        <div className="flex items-center gap-1.5 border border-[var(--border-color)] py-1 px-2 rounded-lg animate-[fade-in_0.15s_ease] w-full justify-between">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-xs text-[var(--text-primary)]">
              {selectedRowIds.length} Selected
            </span>
            <div className="h-[14px] w-px bg-[var(--border-color)] mx-1"></div>
            
            <div className="flex items-center gap-1.2">
              <span className="text-[0.65rem] font-bold text-[var(--text-secondary)] uppercase tracking-[0.05em] mr-0.5">
                Paint Category:
              </span>
              {['black', 'blue', 'purple', 'brown', 'gold'].map((color) => (
                <button
                  key={color}
                  onClick={() => handlePaintRowsColor(color)}
                  className="h-6 px-2 text-[0.7rem] capitalize border cursor-pointer rounded"
                  style={{
                    backgroundColor: `var(--cat-${color}-bg)`,
                    color: `var(--cat-${color}-border)`,
                    borderColor: `var(--cat-${color}-border)`,
                  }}
                  title={`Paint selected rows ${color}`}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={handleBulkDelete}
              className="bg-transparent text-[var(--danger)] border border-[rgba(239,68,68,0.2)] hover:border-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[0.75rem] font-semibold cursor-pointer transition-all duration-150 h-6"
              title="Bulk Delete Selection"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>

            <button
              onClick={() => {
                setSelectedRowIds([]);
                setLastSelectedId(null);
              }}
              className="bg-transparent text-[var(--text-secondary)] border border-[var(--border-color)] hover:border-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] inline-flex items-center px-2.5 py-1 rounded-md text-[0.75rem] font-semibold cursor-pointer transition-all duration-150 h-6"
              title="Deselect All (Ctrl+D)"
            >
              Deselect
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="relative w-full max-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md py-2 pr-4 pl-9 text-[var(--text-primary)] text-[0.85rem] outline-none transition-all duration-200 focus:border-[var(--primary-accent)] focus:shadow-[0_0_0_2px_var(--primary-accent-glow)]"
              id="toolbarSearchInput"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[0.72rem] font-bold text-[var(--text-secondary)] mr-1 uppercase tracking-[0.05em]">
              Filter by Color:
            </span>
            <button
              onClick={() => setColorFilter('all')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.75rem] font-semibold cursor-pointer transition-all duration-150 ${colorFilter === 'all' ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] border-[var(--text-primary)]' : 'bg-[var(--bg-primary)] text-[var(--text-primary)] border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] hover:border-[var(--text-muted)]'} border`}
            >
              All
            </button>
            {['black', 'blue', 'purple', 'brown', 'gold'].map(color => (
              <button
                key={color}
                onClick={() => setColorFilter(color)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.75rem] capitalize font-semibold cursor-pointer transition-all duration-150 border"
                style={{
                  backgroundColor: `var(--cat-${color}-bg)`,
                  color: `var(--cat-${color}-border)`,
                  borderColor: colorFilter === color ? 'var(--text-primary)' : 'var(--border-color)'
                }}
              >
                {color}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
