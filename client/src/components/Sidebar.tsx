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
  LogOut,
  Trash2
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
  const sidebarClass = `bg-card dark:bg-card border-r border-border shadow-lg w-64 h-full flex-shrink-0 fixed md:static z-10 transition-transform duration-300 ease-in-out sidebar-scrollbar overflow-y-auto ${
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
  
  // Переход на страницу корзины
  const goToTrash = () => {
    setLocation("/trash");
  };

  return (
    <div className={sidebarClass}>
      <div className="p-4 flex flex-col h-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-brown dark:text-gold flex items-center">
            <span className="mr-2">💬</span>
            <span>ПромптМастер</span>
          </h1>
          <button onClick={toggleSidebar} className="md:hidden text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>
        
        {/* Categories Navigation */}
        <nav className="mb-6">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Категории</h2>
          <ul>
            {CATEGORIES.map((category) => {
              const IconComponent = iconMap[category.icon];
              return (
                <li className="mb-1" key={category.id}>
                  <button
                    onClick={() => setCategory(category.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center ${
                      categories === category.id
                        ? "bg-accent text-accent-foreground dark:bg-accent dark:text-accent-foreground"
                        : "hover:bg-accent/50 hover:text-accent-foreground dark:hover:bg-accent/40 dark:hover:text-accent-foreground"
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
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Популярные теги</h2>
          <div className="flex flex-wrap gap-2">
            {popularTags.map((tag) => (
              <button
                key={tag}
                onClick={() => onTagClick(tag)}
                className="bg-muted dark:bg-muted text-secondary dark:text-gold px-3 py-1 rounded-full text-sm hover:bg-primary/20 dark:hover:bg-primary/20 transition-colors"
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        <Separator className="my-4" />

        {/* Navigation Links */}
        <nav className="mb-auto">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Навигация</h2>
          <ul>
            <li className="mb-1">
              <button
                onClick={goToStats}
                className="w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center hover:bg-accent/50 dark:hover:bg-accent/40"
              >
                <BarChart2 className="mr-2 h-4 w-4" />
                <span>Статистика</span>
              </button>
            </li>
            <li className="mb-1">
              <button
                onClick={goToTrash}
                className="w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center hover:bg-accent/50 dark:hover:bg-accent/40"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Корзина</span>
              </button>
            </li>
            <li className="mb-1">
              <button
                onClick={goToSettings}
                className="w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center hover:bg-accent/50 dark:hover:bg-accent/40"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Настройки</span>
              </button>
            </li>
            <li className="mb-1">
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/20 dark:hover:text-destructive-foreground"
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
          className="mt-4 bg-orange hover:bg-orange/80 text-white flex items-center justify-center transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" />
          <span>Добавить промпт</span>
        </Button>
      </div>
    </div>
  );
}
