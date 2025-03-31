import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SearchFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeTags: string[];
  toggleTag: (tag: string) => void;
  allTags: string[];
}

export default function SearchFilters({
  searchQuery,
  setSearchQuery,
  activeTags,
  toggleTag,
  allTags
}: SearchFiltersProps) {
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
        setTagDropdownOpen(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  return (
    <div className="bg-card dark:bg-card p-4 shadow-sm border-b border-border">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              type="text"
              placeholder="Поиск промптов..."
              className="w-full pl-10 pr-4 py-2 border-input bg-background focus:ring-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 md:w-auto">
            <div className="relative flex-1 md:flex-initial" ref={tagDropdownRef}>
              <Button
                variant="outline"
                className="w-full flex items-center justify-between bg-background border-input px-4 py-2 hover:bg-accent"
                onClick={() => setTagDropdownOpen(!tagDropdownOpen)}
              >
                <span>Фильтр по тегам</span>
                <ChevronDown className="ml-2 text-muted-foreground" size={16} />
              </Button>
              {tagDropdownOpen && (
                <div className="absolute mt-2 w-64 bg-background border border-border rounded-lg shadow-lg z-10 p-3 max-h-60 overflow-y-auto">
                  <div className="flex flex-wrap gap-2">
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          activeTags.includes(tag)
                            ? "bg-gold dark:bg-gold/70 text-brown dark:text-foreground"
                            : "bg-muted text-brown dark:text-gold hover:bg-gold/30 dark:hover:bg-gold/30"
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Active Filters */}
        {activeTags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {activeTags.map((tag) => (
              <span key={tag} className="inline-flex items-center bg-gold/30 dark:bg-gold/20 text-brown dark:text-gold px-3 py-1 rounded-full text-sm">
                #{tag}
                <button 
                  className="ml-2 text-brown dark:text-gold hover:text-orange"
                  onClick={() => toggleTag(tag)}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
