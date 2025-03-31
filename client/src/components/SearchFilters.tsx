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
    <div className="bg-white p-4 shadow-sm">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              type="text"
              placeholder="Search prompts..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ECD06F] focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 md:w-auto">
            <div className="relative flex-1 md:flex-initial" ref={tagDropdownRef}>
              <Button
                variant="outline"
                className="w-full flex items-center justify-between bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50"
                onClick={() => setTagDropdownOpen(!tagDropdownOpen)}
              >
                <span>Filter by Tags</span>
                <ChevronDown className="ml-2 text-gray-500" size={16} />
              </Button>
              {tagDropdownOpen && (
                <div className="absolute mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-3 max-h-60 overflow-y-auto">
                  <div className="flex flex-wrap gap-2">
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          activeTags.includes(tag)
                            ? "bg-[#ECD06F] text-[#987654]"
                            : "bg-gray-100 text-[#987654] hover:bg-[#f2e0a0]"
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
              <span key={tag} className="inline-flex items-center bg-[#f2e0a0] text-[#987654] px-3 py-1 rounded-full text-sm">
                #{tag}
                <button 
                  className="ml-2 text-[#987654] hover:text-[#DF6C4F]"
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
