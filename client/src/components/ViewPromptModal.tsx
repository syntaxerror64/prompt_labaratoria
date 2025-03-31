import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Prompt } from "@shared/schema";
import { Copy, Check, Edit, Trash2, Calendar } from "lucide-react";
import { CATEGORIES } from "@/lib/types";

interface ViewPromptModalProps {
  isOpen: boolean;
  closeModal: () => void;
  prompt: Prompt | null;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ViewPromptModal({
  isOpen,
  closeModal,
  prompt,
  onEdit,
  onDelete
}: ViewPromptModalProps) {
  const [copied, setCopied] = useState(false);
  
  if (!prompt) return null;
  
  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const categoryName = CATEGORIES.find(c => c.id === prompt.category)?.name || prompt.category;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-800">
            {prompt.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <div className="flex items-center">
            <div className="bg-[#f2e0a0] text-[#987654] px-2 py-1 rounded text-sm font-medium">
              {categoryName}
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">Содержание промпта</h3>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-800">{prompt.content}</p>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">Теги</h3>
            <div className="flex flex-wrap gap-2">
              {prompt.tags.map((tag) => (
                <span key={tag} className="bg-gray-100 text-[#987654] px-2 py-1 rounded-full text-sm">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
          
          <div className="flex items-center text-sm text-gray-500">
            <Calendar className="mr-2" size={16} />
            <span>Добавлено: {format(new Date(prompt.createdAt), 'dd MMM yyyy')}</span>
          </div>
        </div>
        
        <div className="mt-4 flex justify-between">
          <Button
            onClick={handleCopyPrompt}
            variant="outline"
            className="px-4 py-2 bg-gray-100 text-[#987654] rounded-lg hover:bg-gray-200 transition-colors flex items-center"
          >
            {copied ? (
              <>
                <Check className="mr-2" size={16} />
                Скопировано!
              </>
            ) : (
              <>
                <Copy className="mr-2" size={16} />
                Копировать промпт
              </>
            )}
          </Button>
          
          <div className="space-x-3">
            <Button
              onClick={onEdit}
              variant="outline"
              className="px-4 py-2 border border-[#987654] text-[#987654] rounded-lg hover:bg-[#987654] hover:text-white transition-colors"
            >
              <Edit className="mr-2" size={16} />
              Редактировать
            </Button>
            <Button
              onClick={onDelete}
              className="px-4 py-2 bg-[#DF6C4F] text-white rounded-lg hover:bg-[#e8836a] transition-colors"
            >
              <Trash2 className="mr-2" size={16} />
              Удалить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
