import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CATEGORIES, CategoryInfo } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction, AlertDialogTrigger } from "@/components/ui/alert-dialog";

// Схема для добавления новой категории
const categorySchema = z.object({
  id: z.string().min(1, "ID категории обязателен"),
  name: z.string().min(1, "Название категории обязательно"),
  icon: z.string().min(1, "Иконка обязательна"),
});

// Схема для добавления нового тега
const tagSchema = z.object({
  name: z.string().min(1, "Название тега обязательно"),
});

export default function Settings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [customCategories, setCustomCategories] = useState<CategoryInfo[]>([...CATEGORIES]);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState("categories");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);

  // Проверка авторизации
  useEffect(() => {
    const isAuthenticated = sessionStorage.getItem("isAuthenticated") === "true";
    if (!isAuthenticated) {
      setLocation("/login");
    }
  }, [setLocation]);

  // Загрузка настроек из локального хранилища при инициализации
  useEffect(() => {
    const savedCategories = localStorage.getItem("customCategories");
    if (savedCategories) {
      setCustomCategories(JSON.parse(savedCategories));
    }

    const savedTags = localStorage.getItem("customTags");
    if (savedTags) {
      setCustomTags(JSON.parse(savedTags));
    }
  }, []);

  // Сохранение настроек в локальное хранилище при изменении
  useEffect(() => {
    localStorage.setItem("customCategories", JSON.stringify(customCategories));
  }, [customCategories]);

  useEffect(() => {
    localStorage.setItem("customTags", JSON.stringify(customTags));
  }, [customTags]);

  // Форма для добавления категории
  const categoryForm = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      id: "",
      name: "",
      icon: "tag",
    },
  });

  // Форма для добавления тега
  const tagForm = useForm<z.infer<typeof tagSchema>>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      name: "",
    },
  });

  // Обработчик добавления категории
  function onAddCategory(values: z.infer<typeof categorySchema>) {
    // Проверяем, существует ли уже категория с таким id
    if (customCategories.some(cat => cat.id === values.id)) {
      toast({
        title: "Ошибка",
        description: "Категория с таким ID уже существует",
        variant: "destructive",
      });
      return;
    }

    // Добавляем новую категорию
    setCustomCategories([...customCategories, values as CategoryInfo]);
    
    toast({
      title: "Успех",
      description: "Категория успешно добавлена",
    });
    
    categoryForm.reset();
  }

  // Обработчик удаления категории
  function handleDeleteCategory(categoryId: string) {
    setCategoryToDelete(categoryId);
    setIsDeleteDialogOpen(true);
  }

  function confirmDeleteCategory() {
    if (categoryToDelete) {
      // Проверяем, является ли категория предустановленной
      const isDefault = CATEGORIES.some(cat => cat.id === categoryToDelete);
      
      if (isDefault) {
        toast({
          title: "Ошибка",
          description: "Нельзя удалить предустановленную категорию",
          variant: "destructive",
        });
      } else {
        setCustomCategories(customCategories.filter(cat => cat.id !== categoryToDelete));
        toast({
          title: "Успех",
          description: "Категория успешно удалена",
        });
      }
      
      setCategoryToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  }

  // Обработчик добавления тега
  function onAddTag(values: z.infer<typeof tagSchema>) {
    // Проверяем, существует ли уже тег с таким именем
    if (customTags.includes(values.name)) {
      toast({
        title: "Ошибка",
        description: "Тег с таким именем уже существует",
        variant: "destructive",
      });
      return;
    }

    // Добавляем новый тег
    setCustomTags([...customTags, values.name]);
    
    toast({
      title: "Успех",
      description: "Тег успешно добавлен",
    });
    
    tagForm.reset();
  }

  // Обработчик удаления тега
  function handleDeleteTag(tagName: string) {
    setTagToDelete(tagName);
    setIsDeleteDialogOpen(true);
  }

  function confirmDeleteTag() {
    if (tagToDelete) {
      setCustomTags(customTags.filter(tag => tag !== tagToDelete));
      toast({
        title: "Успех",
        description: "Тег успешно удален",
      });
      
      setTagToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#987654]">Настройки</h1>
        <Button 
          onClick={() => setLocation("/")}
          variant="outline"
        >
          Вернуться на главную
        </Button>
      </div>

      <Tabs defaultValue="categories" value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="categories">Категории</TabsTrigger>
          <TabsTrigger value="tags">Теги</TabsTrigger>
        </TabsList>
        
        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Управление категориями</CardTitle>
              <CardDescription>
                Добавляйте и удаляйте категории для классификации промптов
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">Существующие категории</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customCategories.map((category) => (
                    <div 
                      key={category.id} 
                      className="flex items-center justify-between p-3 border rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[#DF6C4F]">{category.icon}</span>
                        <span>{category.name}</span>
                        <Badge variant="outline">{category.id}</Badge>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDeleteCategory(category.id)}
                      >
                        Удалить
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              
              <Separator className="my-6" />
              
              <div>
                <h3 className="text-lg font-medium mb-3">Добавить новую категорию</h3>
                <Form {...categoryForm}>
                  <form onSubmit={categoryForm.handleSubmit(onAddCategory)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={categoryForm.control}
                        name="id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ID категории</FormLabel>
                            <FormControl>
                              <Input placeholder="custom" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={categoryForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Название категории</FormLabel>
                            <FormControl>
                              <Input placeholder="Пользовательская" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={categoryForm.control}
                        name="icon"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Иконка</FormLabel>
                            <FormControl>
                              <Input placeholder="tag" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <Button type="submit" className="bg-[#DF6C4F] hover:bg-[#c85c41]">
                      Добавить категорию
                    </Button>
                  </form>
                </Form>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="tags">
          <Card>
            <CardHeader>
              <CardTitle>Управление тегами</CardTitle>
              <CardDescription>
                Добавляйте и удаляйте теги для фильтрации промптов
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">Существующие теги</h3>
                <div className="flex flex-wrap gap-2">
                  {customTags.map((tag) => (
                    <div 
                      key={tag} 
                      className="flex items-center gap-2 p-2 border rounded-md"
                    >
                      <Badge>{tag}</Badge>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                        onClick={() => handleDeleteTag(tag)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              
              <Separator className="my-6" />
              
              <div>
                <h3 className="text-lg font-medium mb-3">Добавить новый тег</h3>
                <Form {...tagForm}>
                  <form onSubmit={tagForm.handleSubmit(onAddTag)} className="space-y-4">
                    <FormField
                      control={tagForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Название тега</FormLabel>
                          <FormControl>
                            <Input placeholder="новый-тег" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit" className="bg-[#DF6C4F] hover:bg-[#c85c41]">
                      Добавить тег
                    </Button>
                  </form>
                </Form>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтверждение удаления</AlertDialogTitle>
            <AlertDialogDescription>
              {categoryToDelete ? 
                "Вы уверены, что хотите удалить эту категорию? Это действие нельзя отменить." :
                "Вы уверены, что хотите удалить этот тег? Это действие нельзя отменить."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={categoryToDelete ? confirmDeleteCategory : confirmDeleteTag}
              className="bg-red-500 hover:bg-red-600"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}