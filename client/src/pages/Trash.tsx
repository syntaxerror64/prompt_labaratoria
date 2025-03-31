import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

// Интерфейс для удаленного промпта
interface DeletedPrompt {
  id: number;
  originalId: number;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: string;
  deletedAt: string;
  expiryDate: string;
}

export default function Trash() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedPrompt, setSelectedPrompt] = useState<DeletedPrompt | null>(null);
  
  // Запрос на получение удаленных промптов
  const { data: deletedPrompts, isLoading, isError } = useQuery<DeletedPrompt[]>({
    queryKey: ['/api/trash'],
    staleTime: 1000 * 60, // 1 минута
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const response = await fetch('/api/trash', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Ошибка загрузки удаленных промптов');
      }
      return response.json();
    }
  });
  
  // Мутация для восстановления промпта
  const restoreMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/trash/${id}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Ошибка восстановления промпта');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Промпт восстановлен',
        description: 'Промпт успешно восстановлен из корзины',
      });
      // Обновляем кэш для промптов и корзины
      queryClient.invalidateQueries({ queryKey: ['/api/prompts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trash'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка восстановления',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Мутация для окончательного удаления промпта из корзины
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/trash/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Ошибка удаления промпта');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Промпт удален',
        description: 'Промпт окончательно удален из корзины',
      });
      // Обновляем кэш для корзины
      queryClient.invalidateQueries({ queryKey: ['/api/trash'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка удаления',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Мутация для очистки всей корзины
  const emptyTrashMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/trash', {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Ошибка очистки корзины');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Корзина очищена',
        description: 'Все промпты удалены из корзины',
      });
      // Обновляем кэш для корзины
      queryClient.invalidateQueries({ queryKey: ['/api/trash'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка очистки корзины',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Функции обработчики
  const handleRestore = (prompt: DeletedPrompt) => {
    restoreMutation.mutate(prompt.id);
  };
  
  const handleDelete = (prompt: DeletedPrompt) => {
    setSelectedPrompt(prompt);
  };
  
  const confirmDelete = () => {
    if (selectedPrompt) {
      deleteMutation.mutate(selectedPrompt.id);
      setSelectedPrompt(null);
    }
  };
  
  const handleEmptyTrash = () => {
    emptyTrashMutation.mutate();
  };
  
  // Функция для форматирования даты
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };
  
  // Функция для определения оставшегося времени до автоудаления
  const getRemainingDays = (expiryDate: string) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Корзина</h1>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={!deletedPrompts || deletedPrompts.length === 0}>
              <Trash2 className="mr-2 h-4 w-4" />
              Очистить корзину
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
              <AlertDialogDescription>
                Это действие нельзя отменить. Все промпты в корзине будут безвозвратно удалены.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={handleEmptyTrash}>Очистить</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="min-h-[250px]">
              <CardHeader>
                <Skeleton className="h-8 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
              <CardFooter>
                <div className="flex justify-end space-x-2">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-24" />
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Ошибка</AlertTitle>
          <AlertDescription>
            Не удалось загрузить удаленные промпты. Попробуйте обновить страницу.
          </AlertDescription>
        </Alert>
      ) : !deletedPrompts || deletedPrompts.length === 0 ? (
        <div className="text-center py-12">
          <Trash2 className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Корзина пуста</h2>
          <p className="text-muted-foreground mb-6">
            Удаленные промпты будут отображаться здесь в течение 7 дней, после чего они будут автоматически удалены.
          </p>
          <Button onClick={() => setLocation('/')} className="bg-orange hover:bg-orange/80 text-white">
            Вернуться на главную
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {deletedPrompts.map((prompt) => {
              const remainingDays = getRemainingDays(prompt.expiryDate);
              return (
                <Card key={prompt.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle>{prompt.title}</CardTitle>
                    <div className="flex space-x-2 mt-2">
                      <Badge>{prompt.category}</Badge>
                      {remainingDays <= 2 && (
                        <Badge variant="destructive">
                          Удаление через {remainingDays} {remainingDays === 1 ? 'день' : 'дня'}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground truncate-3">
                      {prompt.content}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-4">
                      {prompt.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-4 text-xs text-muted-foreground">
                      <p>Удален: {formatDate(prompt.deletedAt)}</p>
                      <p>Автоудаление: {formatDate(prompt.expiryDate)}</p>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-4">
                    <div className="flex space-x-2 w-full justify-end">
                      <Button 
                        variant="outline" 
                        onClick={() => handleRestore(prompt)}
                        disabled={restoreMutation.isPending}
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Восстановить
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="destructive"
                            onClick={() => handleDelete(prompt)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Удалить
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Промпт "{prompt.title}" будет безвозвратно удален. Это действие нельзя отменить.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmDelete}>Удалить</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}