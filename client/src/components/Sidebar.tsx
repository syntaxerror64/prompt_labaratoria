import { Category, CATEGORIES } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import { 
  Globe, 
  Paintbrush, 
  GraduationCap, 
  Briefcase, 
  Code, 
  MoreHorizontal, 
  Plus, 
  X 
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  categories: Category;
  setCategory: (category: Category) => void;
  popularTags: string[];
  onTagClick: (tag: string) => void;
  onAddPrompt: () => void;
}

const iconMap: Record<string, LucideIcon> = {
  "globe": Globe,
  "paint-brush": Paintbrush,
  "graduation-cap": GraduationCap,
  "briefcase": Briefcase,
  "code": Code,
  "ellipsis-h": MoreHorizontal
};

export default function Sidebar({
  isOpen,
  toggleSidebar,
  categories,
  setCategory,
  popularTags,
  onTagClick,
  onAddPrompt
}: SidebarProps) {
  const sidebarClass = `bg-white shadow-lg w-64 h-full flex-shrink-0 fixed md:static z-10 transition-transform duration-300 ease-in-out ${
    isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
  }`;

  return (
    <div className={sidebarClass}>
      <div className="p-4 flex flex-col h-full">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-[#987654] flex items-center">
            <span className="mr-2">💬</span>
            <span>PromptMaster</span>
          </h1>
          <button onClick={toggleSidebar} className="md:hidden text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
        
        {/* Categories Navigation */}
        <nav className="mb-8">
          <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-4">Categories</h2>
          <ul>
            {CATEGORIES.map((category) => {
              const IconComponent = iconMap[category.icon];
              return (
                <li className="mb-2" key={category.id}>
                  <button
                    onClick={() => setCategory(category.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center ${
                      categories === category.id
                        ? "bg-[#f2e0a0] text-[#987654]"
                        : "hover:bg-[#f2e0a0] hover:text-[#987654]"
                    }`}
                  >
                    <IconComponent className="mr-2 h-4 w-4" />
                    <span>{category.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        
        {/* Popular Tags */}
        <div className="mb-auto">
          <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-4">Popular Tags</h2>
          <div className="flex flex-wrap gap-2">
            {popularTags.map((tag) => (
              <button
                key={tag}
                onClick={() => onTagClick(tag)}
                className="bg-gray-100 text-[#987654] px-3 py-1 rounded-full text-sm hover:bg-[#ECD06F] transition-colors"
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
        
        {/* Add New Prompt Button */}
        <Button 
          onClick={onAddPrompt}
          className="mt-4 bg-[#DF6C4F] hover:bg-[#e8836a] text-white flex items-center justify-center transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" />
          <span>Add New Prompt</span>
        </Button>
      </div>
    </div>
  );
}
