import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Settings from "@/pages/Settings";
import Stats from "@/pages/Stats";
import Trash from "@/pages/Trash";

// Компонент защищенного маршрута
function ProtectedRoute({ component: Component, ...rest }: any) {
  const [, setLocation] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const auth = sessionStorage.getItem("isAuthenticated") === "true";
      setIsAuthenticated(auth);
      setIsLoading(false);
      
      if (!auth) {
        setLocation("/login");
      }
    };
    
    checkAuth();
  }, [setLocation]);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Загрузка...</div>;
  }

  return isAuthenticated ? <Component {...rest} /> : null;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
      <Route path="/stats" component={() => <ProtectedRoute component={Stats} />} />
      <Route path="/trash" component={() => <ProtectedRoute component={Trash} />} />
      <Route path="/" component={() => <ProtectedRoute component={Home} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
