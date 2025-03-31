import { format } from "date-fns";
import { Prompt } from "@shared/schema";
import { Edit, Trash2, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Category, CATEGORIES } from "@/lib/types";

interface PromptGridProps {
  prompts: Prompt[];
  isLoading: boolean;
  activeCategory: Category;
  handleEditPrompt: (prompt: Prompt) => void;
  handleDeletePrompt: (prompt: Prompt) => void;
  handleViewPrompt: (prompt: Prompt) => void;
}

export default function PromptGrid({
  prompts,
  isLoading,
  activeCategory,
  handleEditPrompt,
  handleDeletePrompt,
  handleViewPrompt
}: PromptGridProps) {
  const activeCategoryName = CATEGORIES.find(c => c.id === activeCategory)?.name || "Все промпты";
  // Получаем сохраненный размер карточки из localStorage или используем значение по умолчанию
  const promptCardHeight = parseInt(localStorage.getItem("promptCardHeight") || '320');
  const promptCardWidth = parseInt(localStorage.getItem("promptCardWidth") || '300');
  
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-background dark:bg-background">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-2xl font-bold text-foreground mb-6">{activeCategoryName}</h2>
        
        {isLoading ? (
          <div className="flex flex-wrap justify-center gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="bg-card dark:bg-card rounded-xl shadow-md overflow-hidden border border-border" style={{ height: `${promptCardHeight}px`, width: `${promptCardWidth}px` }}>
                <div className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <Skeleton className="h-6 w-24" />
                    <div className="flex space-x-2">
                      <Skeleton className="h-5 w-5 rounded-full" />
                      <Skeleton className="h-5 w-5 rounded-full" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-2/3 mb-4" />
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </div>
                <div className="bg-muted dark:bg-muted px-5 py-3 flex justify-between items-center border-t border-border">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : prompts.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-foreground mb-2">Промпты не найдены</h3>
            <p className="text-muted-foreground">Попробуйте изменить параметры поиска или фильтры, или добавьте новый промпт.</p>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-6">
            {prompts.map((prompt) => (
              <div key={prompt.id} className="prompt-card bg-card dark:bg-card rounded-xl shadow-md overflow-hidden border border-border transition-transform hover:-translate-y-1 hover:shadow-lg flex flex-col" style={{ height: `${promptCardHeight}px`, width: `${promptCardWidth}px` }}>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <div className="bg-gold/30 dark:bg-gold/20 text-brown dark:text-gold px-2 py-1 rounded text-xs font-medium">
                      {CATEGORIES.find(c => c.id === prompt.category)?.name || prompt.category}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        className="text-muted-foreground hover:text-brown dark:hover:text-gold"
                        onClick={() => handleEditPrompt(prompt)}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="text-muted-foreground hover:text-orange"
                        onClick={() => handleDeletePrompt(prompt)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{prompt.title}</h3>
                  <div className="prompt-content relative flex-grow mb-4">
                    <div className="max-h-[100px] overflow-y-auto custom-scrollbar pr-1">
                      <p className="text-muted-foreground text-sm">{prompt.content}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {prompt.tags.map((tag) => (
                      <span key={tag} className="bg-muted dark:bg-muted text-brown dark:text-gold px-2 py-1 rounded-full text-xs">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="bg-muted dark:bg-muted px-5 py-3 flex justify-between items-center border-t border-border mt-auto">
                  <span className="text-xs text-muted-foreground">
                    Добавлено: {format(new Date(prompt.createdAt), 'dd MMM yyyy')}
                  </span>
                  <button
                    className="text-orange hover:text-orange/80 font-medium text-sm flex items-center gap-1"
                    onClick={() => handleViewPrompt(prompt)}
                  >
                    <Eye size={14} />
                    <span>Подробнее</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
