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
import { updateCredentialsSchema, updateNotionSettingsSchema } from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
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
  const [isLoading, setIsLoading] = useState(false);
  const [promptCardHeight, setPromptCardHeight] = useState<number>(320);
  const [promptCardWidth, setPromptCardWidth] = useState<number>(300);

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
    
    const savedCardHeight = localStorage.getItem("promptCardHeight");
    if (savedCardHeight) {
      setPromptCardHeight(parseInt(savedCardHeight));
    }

    const savedCardWidth = localStorage.getItem("promptCardWidth");
    if (savedCardWidth) {
      setPromptCardWidth(parseInt(savedCardWidth));
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
  
  // Форма для обновления учетных данных
  const credentialsForm = useForm<z.infer<typeof updateCredentialsSchema>>({
    resolver: zodResolver(updateCredentialsSchema),
    defaultValues: {
      username: "",
      currentPassword: "",
      newPassword: "",
    },
  });
  
  // Форма для обновления настроек Notion
  const notionSettingsForm = useForm<z.infer<typeof updateNotionSettingsSchema>>({
    resolver: zodResolver(updateNotionSettingsSchema),
    defaultValues: {
      notionApiToken: "",
      notionDatabaseId: "",
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
  
  // Mutation для обновления учетных данных
  const updateCredentialsMutation = useMutation({
    mutationFn: (data: z.infer<typeof updateCredentialsSchema>) => {
      return apiRequest('POST', '/api/update-credentials', data);
    },
    onSuccess: () => {
      toast({
        title: "Успех",
        description: "Учетные данные успешно обновлены",
      });
      credentialsForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось обновить учетные данные: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Mutation для обновления настроек Notion
  const updateNotionSettingsMutation = useMutation({
    mutationFn: (data: z.infer<typeof updateNotionSettingsSchema>) => {
      return apiRequest('POST', '/api/update-notion-settings', data);
    },
    onSuccess: () => {
      toast({
        title: "Успех",
        description: "Настройки Notion успешно обновлены",
      });
      notionSettingsForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось обновить настройки Notion: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Обработчик обновления учетных данных
  function onUpdateCredentials(values: z.infer<typeof updateCredentialsSchema>) {
    setIsLoading(true);
    updateCredentialsMutation.mutate(values);
  }
  
  // Обработчик обновления настроек Notion
  function onUpdateNotionSettings(values: z.infer<typeof updateNotionSettingsSchema>) {
    setIsLoading(true);
    updateNotionSettingsMutation.mutate(values);
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
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="categories">Категории</TabsTrigger>
          <TabsTrigger value="tags">Теги</TabsTrigger>
          <TabsTrigger value="credentials">Учетные данные</TabsTrigger>
          <TabsTrigger value="notion">Notion API</TabsTrigger>
          <TabsTrigger value="interface">Интерфейс</TabsTrigger>
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
        
        <TabsContent value="credentials">
          <Card>
            <CardHeader>
              <CardTitle>Учетные данные</CardTitle>
              <CardDescription>
                Изменение логина и пароля для доступа к сайту
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...credentialsForm}>
                <form onSubmit={credentialsForm.handleSubmit(onUpdateCredentials)} className="space-y-4">
                  <FormField
                    control={credentialsForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Имя пользователя</FormLabel>
                        <FormControl>
                          <Input placeholder="admin" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={credentialsForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Текущий пароль</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="********" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={credentialsForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Новый пароль</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="********" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="bg-[#DF6C4F] hover:bg-[#c85c41]"
                    disabled={isLoading}
                  >
                    {isLoading ? "Обновление..." : "Обновить учетные данные"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notion">
          <Card>
            <CardHeader>
              <CardTitle>Настройки Notion API</CardTitle>
              <CardDescription>
                Настройка интеграции с базой данных Notion
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...notionSettingsForm}>
                <form onSubmit={notionSettingsForm.handleSubmit(onUpdateNotionSettings)} className="space-y-4">
                  <FormField
                    control={notionSettingsForm.control}
                    name="notionApiToken"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notion API Token</FormLabel>
                        <FormControl>
                          <Input placeholder="secret_..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={notionSettingsForm.control}
                    name="notionDatabaseId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID базы данных Notion</FormLabel>
                        <FormControl>
                          <Input placeholder="1c79a6cd7ecb80fe80a3eb46e485e75c" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="bg-[#DF6C4F] hover:bg-[#c85c41]"
                    disabled={isLoading}
                  >
                    {isLoading ? "Обновление..." : "Обновить настройки Notion"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="interface">
          <Card>
            <CardHeader>
              <CardTitle>Настройки интерфейса</CardTitle>
              <CardDescription>
                Настройка внешнего вида и элементов интерфейса
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-medium mb-3">Размер карточек промптов</h3>
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span>Высота:</span>
                        <span className="font-medium">{promptCardHeight}px</span>
                      </div>
                      <Slider
                        defaultValue={[promptCardHeight]}
                        min={200}
                        max={500}
                        step={20}
                        onValueChange={(value) => {
                          setPromptCardHeight(value[0]);
                          localStorage.setItem("promptCardHeight", value[0].toString());
                        }}
                        className="w-full"
                      />
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span>Ширина:</span>
                        <span className="font-medium">{promptCardWidth}px</span>
                      </div>
                      <Slider
                        defaultValue={[promptCardWidth]}
                        min={200}
                        max={400}
                        step={20}
                        onValueChange={(value) => {
                          setPromptCardWidth(value[0]);
                          localStorage.setItem("promptCardWidth", value[0].toString());
                        }}
                        className="w-full"
                      />
                    </div>
                    
                    <div className="mt-6">
                      <h4 className="text-sm text-muted-foreground mb-2">Предпросмотр:</h4>
                      <div 
                        className="border rounded-lg shadow-sm dark:bg-card p-4"
                        style={{ width: `${promptCardWidth}px`, height: `${promptCardHeight}px` }}
                      >
                        <div className="flex flex-col h-full">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">Название промпта</h4>
                            <Badge variant="outline">Категория</Badge>
                          </div>
                          <div className="flex-grow overflow-hidden">
                            <p className="text-sm text-muted-foreground mb-2 truncate-3">
                              Содержимое промпта с примером текста, который будет отображаться в карточке. 
                              Этот текст может быть длинным, поэтому важно видеть, как он будет обрезаться.
                              Установите оптимальный размер для удобного просмотра.
                            </p>
                          </div>
                          <div className="mt-auto flex flex-wrap gap-1 pt-2">
                            <Badge className="bg-muted text-muted-foreground">тег1</Badge>
                            <Badge className="bg-muted text-muted-foreground">тег2</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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