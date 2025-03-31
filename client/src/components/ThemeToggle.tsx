import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Проверяем тему из localStorage
    const savedTheme = localStorage.getItem("theme") as "light" | "dark";
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    
    // Сохраняем тему в localStorage
    localStorage.setItem("theme", newTheme);
    
    // Применяем тему к документу
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={toggleTheme} 
      className="rounded-full"
      aria-label="Переключить тему"
      title={theme === "light" ? "Переключить на темную тему" : "Переключить на светлую тему"}
    >
      {theme === "light" ? (
        <Moon className="h-5 w-5 text-brown hover:text-orange transition-colors" />
      ) : (
        <Sun className="h-5 w-5 text-gold hover:text-primary/90 transition-colors" />
      )}
    </Button>
  );
}