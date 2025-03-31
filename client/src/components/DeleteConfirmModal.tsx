import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  closeModal: () => void;
  handleConfirmDelete: () => void;
}

export default function DeleteConfirmModal({
  isOpen,
  closeModal,
  handleConfirmDelete
}: DeleteConfirmModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="bg-background dark:bg-background border-border rounded-xl shadow-xl w-full max-w-md">
        <div className="p-2">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/20 dark:bg-destructive/20 text-orange dark:text-orange mb-4">
              <AlertTriangle size={24} />
            </div>
            <h2 className="text-xl font-bold text-foreground">Переместить в корзину</h2>
            <p className="mt-2 text-muted-foreground">
              Вы уверены, что хотите переместить этот промпт в корзину? 
              Вы сможете восстановить его позже из корзины.
            </p>
          </div>
          
          <div className="flex justify-center space-x-3">
            <Button
              variant="outline"
              onClick={closeModal}
              className="border-input bg-background dark:bg-background hover:bg-accent"
            >
              Отмена
            </Button>
            <Button
              onClick={handleConfirmDelete}
              className="bg-orange hover:bg-orange/90 text-white transition-colors"
            >
              Переместить в корзину
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
