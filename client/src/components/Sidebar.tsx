import { Category, CATEGORIES } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import { useLocation } from "wouter";
import { Separator } from "@/components/ui/separator";
import ThemeToggle from "@/components/ThemeToggle";
import { 
  Globe, 
  Paintbrush, 
  GraduationCap, 
  Briefcase, 
  Code, 
  MoreHorizontal, 
  Plus, 
  X,
  Settings,
  BarChart2,
  LogOut
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
  const [, setLocation] = useLocation();
  const sidebarClass = `dark:bg-slate-900 bg-white shadow-lg w-64 h-full flex-shrink-0 fixed md:static z-10 transition-transform duration-300 ease-in-out ${
    isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
  }`;

  // Функция выхода из аккаунта
  const handleLogout = () => {
    sessionStorage.removeItem("isAuthenticated");
    setLocation("/login");
  };

  // Переход на страницу настроек
  const goToSettings = () => {
    setLocation("/settings");
  };

  // Переход на страницу статистики
  const goToStats = () => {
    setLocation("/stats");
  };

  return (
    <div className={sidebarClass}>
      <div className="p-4 flex flex-col h-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#987654] dark:text-[#ECD06F] flex items-center">
            <span className="mr-2">💬</span>
            <span>ПромптМастер</span>
          </h1>
          <button onClick={toggleSidebar} className="md:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <X size={20} />
          </button>
        </div>

        {/* Переключатель темы */}
        <div className="mb-6 flex justify-end">
          <ThemeToggle />
        </div>
        
        {/* Categories Navigation */}
        <nav className="mb-6">
          <h2 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-3">Категории</h2>
          <ul>
            {CATEGORIES.map((category) => {
              const IconComponent = iconMap[category.icon];
              return (
                <li className="mb-1" key={category.id}>
                  <button
                    onClick={() => setCategory(category.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center ${
                      categories === category.id
                        ? "bg-[#f2e0a0] text-[#987654] dark:bg-[#ECD06F]/20 dark:text-[#ECD06F]"
                        : "hover:bg-[#f2e0a0]/50 hover:text-[#987654] dark:hover:bg-[#ECD06F]/10 dark:hover:text-[#ECD06F]"
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
        <div className="mb-6">
          <h2 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-3">Популярные теги</h2>
          <div className="flex flex-wrap gap-2">
            {popularTags.map((tag) => (
              <button
                key={tag}
                onClick={() => onTagClick(tag)}
                className="bg-gray-100 dark:bg-gray-800 text-[#987654] dark:text-[#ECD06F] px-3 py-1 rounded-full text-sm hover:bg-[#ECD06F]/30 dark:hover:bg-[#ECD06F]/20 transition-colors"
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        <Separator className="my-4" />

        {/* Navigation Links */}
        <nav className="mb-auto">
          <h2 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-3">Навигация</h2>
          <ul>
            <li className="mb-1">
              <button
                onClick={goToStats}
                className="w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center hover:bg-[#f2e0a0]/50 hover:text-[#987654] dark:hover:bg-[#ECD06F]/10 dark:hover:text-[#ECD06F]"
              >
                <BarChart2 className="mr-2 h-4 w-4" />
                <span>Статистика</span>
              </button>
            </li>
            <li className="mb-1">
              <button
                onClick={goToSettings}
                className="w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center hover:bg-[#f2e0a0]/50 hover:text-[#987654] dark:hover:bg-[#ECD06F]/10 dark:hover:text-[#ECD06F]"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Настройки</span>
              </button>
            </li>
            <li className="mb-1">
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Выйти</span>
              </button>
            </li>
          </ul>
        </nav>
        
        {/* Add New Prompt Button */}
        <Button 
          onClick={onAddPrompt}
          className="mt-4 bg-[#DF6C4F] hover:bg-[#e8836a] text-white flex items-center justify-center transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" />
          <span>Добавить промпт</span>
        </Button>
      </div>
    </div>
  );
}
