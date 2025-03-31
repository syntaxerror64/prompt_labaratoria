import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Redirect, useLocation } from "wouter";

const loginSchema = z.object({
  username: z.string().min(1, "Требуется имя пользователя"),
  password: z.string().min(1, "Требуется пароль"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Имя пользователя должно содержать не менее 3 символов"),
  password: z.string().min(6, "Пароль должен содержать не менее 6 символов"),
});

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();
  
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Редирект на главную, если пользователь уже авторизован
  // ВАЖНО: этот блок должен идти после всех хуков
  if (user) {
    return <Redirect to="/" />;
  }

  function onLoginSubmit(values: z.infer<typeof loginSchema>) {
    loginMutation.mutate(values, {
      onSuccess: () => {
        setLocation("/");
      },
    });
  }

  function onRegisterSubmit(values: z.infer<typeof registerSchema>) {
    registerMutation.mutate(values, {
      onSuccess: () => {
        setLocation("/");
      },
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-5xl grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col justify-center space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Добро пожаловать</h1>
            <p className="text-muted-foreground mt-2">
              Войдите в систему или создайте новый аккаунт для начала работы с менеджером промптов
            </p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Вход</TabsTrigger>
              <TabsTrigger value="register">Регистрация</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Вход в систему</CardTitle>
                  <CardDescription>
                    Введите свои учетные данные для входа
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
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
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Пароль</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full bg-orange hover:bg-orange/90" 
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? (
                          <div className="flex items-center">
                            <span className="animate-spin mr-2">◌</span> Вход...
                          </div>
                        ) : (
                          "Войти"
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="flex justify-center text-sm text-muted-foreground">
                  <p>Стандартные учетные данные: admin / admin</p>
                </CardFooter>
              </Card>
            </TabsContent>
            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Создание аккаунта</CardTitle>
                  <CardDescription>
                    Создайте новую учетную запись
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Имя пользователя</FormLabel>
                            <FormControl>
                              <Input placeholder="newuser" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Пароль</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full bg-orange hover:bg-orange/90" 
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? (
                          <div className="flex items-center">
                            <span className="animate-spin mr-2">◌</span> Регистрация...
                          </div>
                        ) : (
                          "Зарегистрироваться"
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        <div className="hidden lg:flex lg:flex-col lg:justify-center lg:rounded-lg lg:bg-muted lg:p-8">
          <div className="space-y-6 text-center">
            <div className="mx-auto h-24 w-24 text-4xl flex items-center justify-center rounded-full bg-orange/10 text-orange">
              📝
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Менеджер промптов</h2>
              <p className="text-muted-foreground">
                Организуйте, сохраняйте и находите свои лучшие промпты для работы с ИИ.
                Простой доступ к вашей коллекции промптов в любое время.
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <div className="h-1 w-1 rounded-full bg-orange"></div>
                <div className="text-sm text-muted-foreground">Организация по категориям</div>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <div className="h-1 w-1 rounded-full bg-orange"></div>
                <div className="text-sm text-muted-foreground">Поиск по ключевым словам и тегам</div>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <div className="h-1 w-1 rounded-full bg-orange"></div>
                <div className="text-sm text-muted-foreground">Синхронизация с Notion</div>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <div className="h-1 w-1 rounded-full bg-orange"></div>
                <div className="text-sm text-muted-foreground">Статистика и аналитика</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}