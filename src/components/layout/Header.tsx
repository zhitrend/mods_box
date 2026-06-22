import { useModStore } from '../../stores/modStore';
import { Input, Button } from '../ui';
import { Search, Moon, Sun } from 'lucide-react';

export function Header() {
  const { searchQuery, setSearchQuery, darkMode, toggleDarkMode } = useModStore();

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-6">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="搜索模组..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <Button variant="ghost" size="icon" onClick={toggleDarkMode} title="切换主题">
        {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
    </header>
  );
}
