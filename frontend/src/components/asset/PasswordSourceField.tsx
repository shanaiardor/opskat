import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { credential_entity } from "../../../wailsjs/go/models";

interface PasswordSourceFieldProps {
  source: "inline" | "managed";
  onSourceChange: (source: "inline" | "managed") => void;
  password: string;
  onPasswordChange: (password: string) => void;
  credentialId: number;
  onCredentialIdChange: (id: number) => void;
  managedPasswords: credential_entity.Credential[];
  /** Placeholder for inline password input when no existing password */
  placeholder?: string;
  /** Placeholder shown when an existing encrypted password is set */
  hasExistingPassword?: boolean;
}

export function PasswordSourceField({
  source,
  onSourceChange,
  password,
  onPasswordChange,
  credentialId,
  onCredentialIdChange,
  managedPasswords,
  placeholder = "",
  hasExistingPassword = false,
}: PasswordSourceFieldProps) {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="grid gap-3 border rounded-lg p-3">
      <div className="grid gap-2">
        <Label>{t("asset.passwordSource")}</Label>
        <Select value={source} onValueChange={(v) => onSourceChange(v as "inline" | "managed")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="inline">{t("asset.passwordSourceInline")}</SelectItem>
            <SelectItem value="managed">{t("asset.passwordSourceManaged")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {source === "inline" ? (
        <div className="grid gap-2">
          <Label>{t("asset.password")}</Label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder={hasExistingPassword ? t("asset.passwordUnchanged") : placeholder}
              className="pr-9"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-2">
          <Label>{t("asset.selectPassword")}</Label>
          {managedPasswords.length > 0 ? (
            <Select value={String(credentialId)} onValueChange={(v) => onCredentialIdChange(Number(v))}>
              <SelectTrigger>
                <SelectValue placeholder={t("asset.selectPasswordPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">{t("asset.selectPasswordPlaceholder")}</SelectItem>
                {managedPasswords.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                    {p.username ? ` (${p.username})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-xs text-muted-foreground">{t("asset.noManagedPasswords")}</p>
          )}
        </div>
      )}
    </div>
  );
}
