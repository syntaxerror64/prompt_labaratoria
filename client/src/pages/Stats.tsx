import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Prompt } from "@shared/schema";
import { Category, CATEGORIES } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

export default function Stats() {
  const [, setLocation] = useLocation();

  // Проверка авторизации
  useEffect(() => {
    const isAuthenticated = sessionStorage.getItem("isAuthenticated") === "true";
    if (!isAuthenticated) {
      setLocation("/login");
    }
  }, [setLocation]);

  // Загрузка данных промптов
  const { data: prompts = [], isLoading } = useQuery<Prompt[]>({
    queryKey: ['/api/prompts'],
  });

  // Данные для диаграмм
  const getCategoryData = () => {
    const categoryCount: Record<string, number> = {};
    
    // Инициализируем счетчики для всех категорий
    CATEGORIES.forEach(cat => {
      categoryCount[cat.name] = 0;
    });
    
    // Подсчитываем количество промптов в каждой категории
    prompts.forEach((prompt) => {
      const category = CATEGORIES.find(cat => cat.id === prompt.category);
      if (category) {
        categoryCount[category.name] = (categoryCount[category.name] || 0) + 1;
      }
    });
    
    // Преобразуем в формат для диаграммы
    return Object.entries(categoryCount).map(([name, value]) => ({ name, value }));
  };

  const getTagData = () => {
    const tagCount: Record<string, number> = {};
    
    // Подсчитываем количество использований каждого тега
    prompts.forEach((prompt) => {
      prompt.tags.forEach(tag => {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      });
    });
    
    // Сортируем по убыванию и берем топ-10
    return Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  };

  const getCreationDateData = () => {
    const dateCount: Record<string, number> = {};
    
    // Группируем по месяцам
    prompts.forEach((prompt) => {
      const date = new Date(prompt.createdAt);
      const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
      dateCount[monthYear] = (dateCount[monthYear] || 0) + 1;
    });
    
    // Преобразуем в формат для диаграммы и сортируем по дате
    return Object.entries(dateCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => {
        const [monthA, yearA] = a.name.split('/').map(Number);
        const [monthB, yearB] = b.name.split('/').map(Number);
        return (yearA * 12 + monthA) - (yearB * 12 + monthB);
      });
  };

  // Цвета для графиков
  const COLORS = ['#ECD06F', '#DF6C4F', '#987654', '#76a8cc', '#8bc34a', '#9c27b0'];

  // Форматирование месяца/года для отображения
  const formatMonthYear = (monthYear: string) => {
    const [month, year] = monthYear.split('/');
    const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#987654]">Статистика</h1>
        <Button 
          onClick={() => setLocation("/")}
          variant="outline"
        >
          Вернуться на главную
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-xl text-gray-500">Загрузка данных...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Статистика по категориям */}
          <Card>
            <CardHeader>
              <CardTitle>Распределение по категориям</CardTitle>
              <CardDescription>
                Количество промптов в каждой категории
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getCategoryData()}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {getCategoryData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} промптов`, 'Количество']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Статистика по тегам */}
          <Card>
            <CardHeader>
              <CardTitle>Популярные теги</CardTitle>
              <CardDescription>
                ТОП-10 наиболее используемых тегов
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={getTagData()}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip formatter={(value) => [`${value} использований`, 'Количество']} />
                  <Legend />
                  <Bar dataKey="value" fill="#DF6C4F" name="Количество использований" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Статистика по времени создания */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Динамика создания промптов</CardTitle>
              <CardDescription>
                Количество созданных промптов по месяцам
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={getCreationDateData()}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tickFormatter={formatMonthYear} />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [`${value} промптов`, 'Создано']}
                    labelFormatter={formatMonthYear}
                  />
                  <Legend />
                  <Bar dataKey="value" fill="#987654" name="Созданные промпты" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Общая статистика */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Общая статистика</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#f9f3e1] p-4 rounded-lg text-center">
                  <div className="text-4xl font-bold text-[#987654]">{prompts.length}</div>
                  <div className="mt-2 text-gray-600">Всего промптов</div>
                </div>
                <div className="bg-[#fbece8] p-4 rounded-lg text-center">
                  <div className="text-4xl font-bold text-[#DF6C4F]">
                    {Array.from(new Set(prompts.flatMap((p) => p.tags))).length}
                  </div>
                  <div className="mt-2 text-gray-600">Уникальных тегов</div>
                </div>
                <div className="bg-[#f1f1f1] p-4 rounded-lg text-center">
                  <div className="text-4xl font-bold text-[#987654]">
                    {prompts.length > 0
                      ? Math.round(prompts.reduce((sum: number, p) => sum + p.content.length, 0) / prompts.length)
                      : 0}
                  </div>
                  <div className="mt-2 text-gray-600">Средняя длина промпта</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}