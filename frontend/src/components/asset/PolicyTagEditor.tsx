import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const TAG_COLORS: Record<string, string> = {
  green: "bg-green-500/10 text-green-600",
  red: "bg-red-500/10 text-red-600",
  orange: "bg-orange-500/10 text-orange-600",
};

interface PolicyTagEditorProps {
  label: string;
  items: string[];
  input: string;
  onInputChange: (v: string) => void;
  onAdd: (val: string) => void;
  onRemove: (idx: number) => void;
  placeholder: string;
  color: string;
}

export function PolicyTagEditor({
  label,
  items,
  input,
  onInputChange,
  onAdd,
  onRemove,
  placeholder,
  color,
}: PolicyTagEditorProps) {
  return (
    <div className="grid gap-2 mb-3">
      <Label className="text-xs">{label}</Label>
      <div className="flex flex-wrap gap-1.5 min-h-[24px]">
        {items.map((item, i) => (
          <span
            key={i}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono",
              TAG_COLORS[color]
            )}
          >
            {item}
            <button
              type="button"
              className="hover:text-destructive"
              onClick={() => onRemove(i)}
            >
              x
            </button>
          </span>
        ))}
      </div>
      <Input
        className="h-7 text-xs font-mono"
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && input.trim()) {
            e.preventDefault();
            onAdd(input.trim());
            onInputChange("");
          }
        }}
        placeholder={placeholder}
      />
    </div>
  );
}
