import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Prompt } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Category } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/Sidebar";
import SearchFilters from "@/components/SearchFilters";
import PromptGrid from "@/components/PromptGrid";
import PromptModal from "@/components/PromptModal";
import ViewPromptModal from "@/components/ViewPromptModal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  // State for sidebar on mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // State for search and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  
  // State for modals
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<Prompt | null>(null);
  
  // Toasts
  const { toast } = useToast();
  
  // Fetch prompts
  const { data: prompts = [], isLoading } = useQuery<Prompt[]>({
    queryKey: ['/api/prompts'],
  });
  
  // Filter prompts based on search, tags, and category
  const filteredPrompts = prompts.filter((prompt) => {
    // Filter by search query
    const matchesSearch = searchQuery === "" || 
      prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prompt.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter by active tags
    const matchesTags = activeTags.length === 0 || 
      activeTags.every(tag => prompt.tags.includes(tag));
    
    // Filter by category
    const matchesCategory = activeCategory === "all" || 
      prompt.category === activeCategory;
    
    return matchesSearch && matchesTags && matchesCategory;
  });
  
  // Get all tags from prompts
  const allTags: string[] = Array.from(
    new Set(
      prompts.flatMap((prompt) => prompt.tags)
    )
  );
  
  // Popular tags (take the 5 most common tags)
  const tagCount: Record<string, number> = {};
  prompts.forEach((prompt) => {
    prompt.tags.forEach(tag => {
      tagCount[tag] = (tagCount[tag] || 0) + 1;
    });
  });
  
  const popularTags = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);
  
  // Create prompt mutation
  const createPromptMutation = useMutation({
    mutationFn: (prompt: Omit<Prompt, 'id' | 'createdAt'>) => {
      return apiRequest('POST', '/api/prompts', prompt);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/prompts'] });
      setIsPromptModalOpen(false);
      toast({
        title: "Success",
        description: "Prompt saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save prompt: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Update prompt mutation
  const updatePromptMutation = useMutation({
    mutationFn: (prompt: Prompt) => {
      return apiRequest('PUT', `/api/prompts/${prompt.id}`, prompt);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/prompts'] });
      setIsPromptModalOpen(false);
      toast({
        title: "Success",
        description: "Prompt updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update prompt: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Delete prompt mutation
  const deletePromptMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest('DELETE', `/api/prompts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/prompts'] });
      setIsDeleteModalOpen(false);
      setIsViewModalOpen(false);
      toast({
        title: "Success",
        description: "Prompt deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete prompt: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Handlers
  const handleAddPrompt = () => {
    setCurrentPrompt(null);
    setIsPromptModalOpen(true);
  };
  
  const handleEditPrompt = (prompt: Prompt) => {
    setCurrentPrompt(prompt);
    setIsPromptModalOpen(true);
  };
  
  const handleViewPrompt = (prompt: Prompt) => {
    setCurrentPrompt(prompt);
    setIsViewModalOpen(true);
  };
  
  const handleSavePrompt = (prompt: Omit<Prompt, 'id' | 'createdAt'> | Prompt) => {
    if ('id' in prompt) {
      updatePromptMutation.mutate(prompt as Prompt);
    } else {
      createPromptMutation.mutate(prompt);
    }
  };
  
  const handleDeletePromptConfirm = () => {
    if (currentPrompt) {
      deletePromptMutation.mutate(currentPrompt.id);
    }
  };
  
  const handleDeletePrompt = (prompt: Prompt) => {
    setCurrentPrompt(prompt);
    setIsDeleteModalOpen(true);
  };
  
  const toggleTag = (tag: string) => {
    setActiveTags(activeTags.includes(tag) 
      ? activeTags.filter(t => t !== tag) 
      : [...activeTags, tag]
    );
  };
  
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        categories={activeCategory}
        setCategory={setActiveCategory}
        popularTags={popularTags}
        onTagClick={toggleTag}
        onAddPrompt={handleAddPrompt}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background dark:bg-background">
        {/* Mobile Header */}
        <header className="bg-background dark:bg-card shadow-sm md:hidden">
          <div className="flex justify-between items-center p-4">
            <button onClick={() => setSidebarOpen(true)} className="text-foreground">
              <i className="fas fa-bars text-xl"></i>
            </button>
            <h1 className="text-xl font-bold text-brown dark:text-gold">ПромптМастер</h1>
            <button onClick={handleAddPrompt} className="text-orange">
              <i className="fas fa-plus text-xl"></i>
            </button>
          </div>
        </header>
        
        {/* Desktop Header with Theme Toggle */}
        <div className="hidden md:flex justify-end p-4">
          <ThemeToggle />
        </div>
        
        {/* Search and Filters */}
        <SearchFilters 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeTags={activeTags}
          toggleTag={toggleTag}
          allTags={allTags}
        />
        
        {/* Prompts Grid */}
        <PromptGrid 
          prompts={filteredPrompts}
          isLoading={isLoading}
          activeCategory={activeCategory}
          handleEditPrompt={handleEditPrompt}
          handleDeletePrompt={handleDeletePrompt}
          handleViewPrompt={handleViewPrompt}
        />
      </div>
      
      {/* Modals */}
      <PromptModal 
        isOpen={isPromptModalOpen} 
        closeModal={() => setIsPromptModalOpen(false)} 
        currentPrompt={currentPrompt}
        handleSave={handleSavePrompt}
      />
      
      <ViewPromptModal 
        isOpen={isViewModalOpen}
        closeModal={() => setIsViewModalOpen(false)}
        prompt={currentPrompt}
        onEdit={() => {
          setIsViewModalOpen(false);
          setIsPromptModalOpen(true);
        }}
        onDelete={() => {
          setIsViewModalOpen(false);
          setIsDeleteModalOpen(true);
        }}
      />
      
      <DeleteConfirmModal 
        isOpen={isDeleteModalOpen}
        closeModal={() => setIsDeleteModalOpen(false)}
        handleConfirmDelete={handleDeletePromptConfirm}
      />
    </div>
  );
}
