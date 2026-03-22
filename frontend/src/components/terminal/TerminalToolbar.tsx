import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RemotePathDialog } from "@/components/terminal/RemotePathDialog";
import { TransferProgress } from "@/components/terminal/TransferProgress";
import { useSFTPStore } from "@/stores/sftpStore";
import { useTerminalStore } from "@/stores/terminalStore";

interface TerminalToolbarProps {
  tabId: string;
}

export function TerminalToolbar({ tabId }: TerminalToolbarProps) {
  const { t } = useTranslation();
  const { startUpload, startUploadDir, startDownload, startDownloadDir } =
    useSFTPStore();
  const tab = useTerminalStore((s) => s.tabs.find((t) => t.id === tabId));

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<
    "upload" | "uploadDir" | "download" | "downloadDir"
  >("upload");

  if (!tab) return null;

  // Get active session ID from the active pane
  const sessionId = tab.activePaneId;

  const openDialog = (
    mode: "upload" | "uploadDir" | "download" | "downloadDir"
  ) => {
    setDialogMode(mode);
    setDialogOpen(true);
  };

  const handleConfirm = async (remotePath: string) => {
    if (!sessionId) return;
    switch (dialogMode) {
      case "upload":
        await startUpload(sessionId, remotePath);
        break;
      case "uploadDir":
        await startUploadDir(sessionId, remotePath);
        break;
      case "download":
        await startDownload(sessionId, remotePath);
        break;
      case "downloadDir":
        await startDownloadDir(sessionId, remotePath);
        break;
    }
  };

  const isUpload = dialogMode === "upload" || dialogMode === "uploadDir";

  return (
    <>
      <div className="flex items-center gap-1 px-2 py-1 border-t bg-background shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs" title={t("sftp.upload")}>
              <Upload className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => openDialog("upload")}>
              {t("sftp.upload")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openDialog("uploadDir")}>
              {t("sftp.uploadDir")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs" title={t("sftp.download")}>
              <Download className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => openDialog("download")}>
              {t("sftp.download")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openDialog("downloadDir")}>
              {t("sftp.downloadDir")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Transfer progress inline */}
        <div className="flex-1 min-w-0">
          <TransferProgress sessionId={sessionId} />
        </div>
      </div>

      <RemotePathDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={isUpload ? t("sftp.uploadTo") : t("sftp.downloadFrom")}
        onConfirm={handleConfirm}
      />
    </>
  );
}
