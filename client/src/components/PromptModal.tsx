import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPromptSchema } from "@shared/schema";
import { Prompt } from "@shared/schema";
import { CATEGORIES } from "@/lib/types";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { X } from "lucide-react";

interface PromptModalProps {
  isOpen: boolean;
  closeModal: () => void;
  currentPrompt: Prompt | null;
  handleSave: (prompt: any) => void;
}

// Extend the schema with better validation
const formSchema = insertPromptSchema.extend({
  title: z.string().min(3, "Title must be at least 3 characters"),
  content: z.string().min(10, "Content must be at least 10 characters"),
  tags: z.array(z.string()).min(1, "Add at least one tag"),
});

export default function PromptModal({
  isOpen,
  closeModal,
  currentPrompt,
  handleSave
}: PromptModalProps) {
  const isEditing = Boolean(currentPrompt);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      category: "creative",
      tags: [],
    },
  });
  
  // Update form when editing an existing prompt
  useEffect(() => {
    if (currentPrompt) {
      form.reset({
        title: currentPrompt.title,
        content: currentPrompt.content,
        category: currentPrompt.category,
        tags: currentPrompt.tags,
      });
    } else {
      form.reset({
        title: "",
        content: "",
        category: "creative",
        tags: [],
      });
    }
  }, [currentPrompt, form, isOpen]);
  
  function onSubmit(values: z.infer<typeof formSchema>) {
    if (isEditing && currentPrompt) {
      handleSave({ ...values, id: currentPrompt.id, createdAt: currentPrompt.createdAt });
    } else {
      handleSave(values);
    }
  }
  
  // Handle tag input
  const [tagInput, setTagInput] = useState("");
  
  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !form.getValues().tags.includes(tag)) {
      form.setValue("tags", [...form.getValues().tags, tag]);
      setTagInput("");
    }
  };
  
  const removeTag = (tagToRemove: string) => {
    form.setValue(
      "tags",
      form.getValues().tags.filter((tag) => tag !== tagToRemove)
    );
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-800">
            {isEditing ? "Edit Prompt" : "Add New Prompt"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Prompt Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter a descriptive title"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Category</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORIES.filter(c => c.id !== "all").map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Prompt Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Write your prompt here. Use [placeholders] for variable content."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      rows={6}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="tags"
              render={() => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Tags</FormLabel>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a tag and press Enter"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                      className="flex-1"
                    />
                    <Button type="button" onClick={addTag} variant="outline">
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.getValues().tags.map((tag) => (
                      <div
                        key={tag}
                        className="bg-[#f2e0a0] text-[#987654] px-3 py-1 rounded-full text-sm flex items-center"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-2 text-[#987654] hover:text-[#DF6C4F]"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                  {form.formState.errors.tags && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.tags.message}</p>
                  )}
                </FormItem>
              )}
            />
            
            <div className="mt-8 flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={closeModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="px-4 py-2 bg-[#DF6C4F] hover:bg-[#e8836a] text-white rounded-lg transition-colors"
              >
                Save Prompt
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
