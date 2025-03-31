import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Prompt } from "@shared/schema";
import { Category, CATEGORIES } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Copy, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";

export default function Constructor() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [selectedCategory, setSelectedCategory] = useState<Category>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [popularTags, setPopularTags] = useState<string[]>([]);
  const [selectedPrompts, setSelectedPrompts] = useState<number[]>([]);
  const [isCombineModalOpen, setIsCombineModalOpen] = useState(false);
  const [combinedContent, setCombinedContent] = useState("");

  // Fetch prompts
  const { data: prompts = [], isLoading } = useQuery<Prompt[]>({
    queryKey: ["/api/prompts"],
  });

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Update popular tags when prompts change
  useEffect(() => {
    if (prompts.length > 0) {
      const tagCounts = new Map<string, number>();
      prompts.forEach((prompt) => {
        prompt.tags.forEach((tag) => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
      });

      // Sort tags by count and take top 5
      const sortedTags = Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag]) => tag);

      setPopularTags(sortedTags);
    }
  }, [prompts]);

  // Filter prompts based on search, category, and tags
  const filteredPrompts = prompts.filter((prompt) => {
    const matchesSearch =
      searchQuery === "" ||
      prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prompt.content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" || prompt.category === selectedCategory;

    const matchesTags =
      activeTags.length === 0 ||
      activeTags.every((tag) => prompt.tags.includes(tag));

    return matchesSearch && matchesCategory && matchesTags;
  });

  // Handle tag click
  const handleTagClick = (tag: string) => {
    if (activeTags.includes(tag)) {
      setActiveTags(activeTags.filter((t) => t !== tag));
    } else {
      setActiveTags([...activeTags, tag]);
    }
  };

  // Handle prompt selection
  const handlePromptSelect = (promptId: number) => {
    if (selectedPrompts.includes(promptId)) {
      setSelectedPrompts(selectedPrompts.filter((id) => id !== promptId));
    } else {
      setSelectedPrompts([...selectedPrompts, promptId]);
    }
  };

  // Open combine modal
  const handleCombinePrompts = () => {
    if (selectedPrompts.length === 0) {
      toast({
        title: "Ничего не выбрано",
        description: "Выберите хотя бы один промпт для объединения",
        variant: "destructive",
      });
      return;
    }

    const selected = prompts.filter((p) => selectedPrompts.includes(p.id));
    const combined = selected.map((p) => p.content).join("\n\n");
    setCombinedContent(combined);
    setIsCombineModalOpen(true);
  };

  // Close combine modal
  const closeCombineModal = () => {
    setIsCombineModalOpen(false);
  };

  // Copy combined content
  const copyToClipboard = () => {
    navigator.clipboard.writeText(combinedContent);
    toast({
      title: "Скопировано",
      description: "Объединенный текст скопирован в буфер обмена",
    });
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        isOpen={sidebarOpen}
        toggleSidebar={toggleSidebar}
        categories={selectedCategory}
        setCategory={setSelectedCategory}
        popularTags={popularTags}
        onTagClick={handleTagClick}
        onAddPrompt={() => {}}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-card dark:bg-card border-b border-border p-4 flex justify-between items-center">
          <div className="flex items-center">
            <button
              className="p-2 mr-4 rounded-md hover:bg-accent md:hidden"
              onClick={toggleSidebar}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="feather feather-menu"
              >
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-orange">Конструктор промптов</h1>
          </div>
          <div>
            {selectedPrompts.length > 0 && (
              <Button
                className="bg-orange hover:bg-orange/80 text-white"
                onClick={handleCombinePrompts}
              >
                Объединить ({selectedPrompts.length})
              </Button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPrompts.map((prompt) => (
              <Card key={prompt.id} className="relative flex flex-col">
                <div className="absolute top-3 right-3">
                  <Checkbox
                    id={`prompt-${prompt.id}`}
                    checked={selectedPrompts.includes(prompt.id)}
                    onCheckedChange={() => handlePromptSelect(prompt.id)}
                    className="border-orange bg-card checked:bg-orange"
                  />
                </div>
                <CardHeader>
                  <CardTitle>{prompt.title}</CardTitle>
                  <CardDescription>
                    {CATEGORIES.find((c) => c.id === prompt.category)?.name || prompt.category}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="max-h-32 overflow-y-auto custom-scrollbar pr-1">
                    <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                      {prompt.content}
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(prompt.createdAt), "dd MMM yyyy")}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {prompt.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-muted dark:bg-muted text-brown dark:text-gold px-2 py-1 rounded-full text-xs"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </main>
      </div>

      {/* Combine Modal */}
      <Dialog open={isCombineModalOpen} onOpenChange={setIsCombineModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Объединенные промпты</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto my-4 p-4 border border-border rounded-md bg-muted/30">
            <pre className="whitespace-pre-wrap text-foreground">{combinedContent}</pre>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeCombineModal} className="mr-2">
              <X className="mr-2 h-4 w-4" />
              Закрыть
            </Button>
            <Button onClick={copyToClipboard} className="bg-orange hover:bg-orange/80 text-white">
              <Copy className="mr-2 h-4 w-4" />
              Копировать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}