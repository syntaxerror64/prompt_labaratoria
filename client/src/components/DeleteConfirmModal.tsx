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
      <DialogContent className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-2">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-[#DF6C4F] mb-4">
              <AlertTriangle size={24} />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Delete Prompt</h2>
            <p className="mt-2 text-gray-600">
              Are you sure you want to delete this prompt? This action cannot be undone.
            </p>
          </div>
          
          <div className="flex justify-center space-x-3">
            <Button
              variant="outline"
              onClick={closeModal}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              className="px-4 py-2 bg-[#DF6C4F] hover:bg-[#e8836a] text-white rounded-lg transition-colors"
            >
              Yes, Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
