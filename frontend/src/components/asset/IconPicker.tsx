import {
  Server,
  Database,
  Cloud,
  Monitor,
  Laptop,
  Router,
  HardDrive,
  Globe,
  Shield,
  Container,
  Cpu,
  Network,
  Folder,
  FolderOpen,
  FolderHeart,
  Archive,
  Box,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ASSET_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  server: Server,
  database: Database,
  cloud: Cloud,
  monitor: Monitor,
  laptop: Laptop,
  router: Router,
  "hard-drive": HardDrive,
  globe: Globe,
  shield: Shield,
  container: Container,
  cpu: Cpu,
  network: Network,
};

const GROUP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  folder: Folder,
  "folder-open": FolderOpen,
  "folder-heart": FolderHeart,
  archive: Archive,
  box: Box,
  layers: Layers,
  cloud: Cloud,
  shield: Shield,
};

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  type?: "asset" | "group";
}

export function IconPicker({ value, onChange, type = "asset" }: IconPickerProps) {
  const icons = type === "group" ? GROUP_ICONS : ASSET_ICONS;

  return (
    <div className="flex flex-wrap gap-1">
      {Object.entries(icons).map(([name, Icon]) => (
        <button
          key={name}
          type="button"
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md border transition-colors",
            value === name
              ? "border-primary bg-primary/10 text-primary"
              : "border-transparent hover:bg-muted text-muted-foreground"
          )}
          onClick={() => onChange(name)}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}

// 根据图标名称获取对应组件，用于渲染
export function getIconComponent(name: string): React.ComponentType<{ className?: string }> {
  return ASSET_ICONS[name] || GROUP_ICONS[name] || Server;
}
