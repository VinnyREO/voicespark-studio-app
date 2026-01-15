import { Undo2, Redo2, Scissors, Copy, Clipboard, Trash2, Magnet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  snapEnabled: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onSplit: () => void;
  onToggleSnap: () => void;
}

export function Toolbar({
  canUndo,
  canRedo,
  hasSelection,
  snapEnabled,
  onUndo,
  onRedo,
  onCopy,
  onPaste,
  onDelete,
  onSplit,
  onToggleSnap,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-card/30">
      {/* Undo/Redo */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onUndo}
            disabled={!canUndo}
            variant="ghost"
            size="sm"
            className="gap-2"
          >
            <Undo2 className="w-4 h-4" />
            Undo
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Undo (Cmd+Z)</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onRedo}
            disabled={!canRedo}
            variant="ghost"
            size="sm"
            className="gap-2"
          >
            <Redo2 className="w-4 h-4" />
            Redo
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Redo (Cmd+Shift+Z)</p>
        </TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-6 mx-2" />

      {/* Edit Tools */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onSplit}
            variant="ghost"
            size="sm"
            className="gap-2"
          >
            <Scissors className="w-4 h-4" />
            Split
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Split clip at playhead (S)</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onCopy}
            disabled={!hasSelection}
            variant="ghost"
            size="sm"
            className="gap-2"
          >
            <Copy className="w-4 h-4" />
            Copy
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Copy selected (Cmd+C)</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onPaste}
            variant="ghost"
            size="sm"
            className="gap-2"
          >
            <Clipboard className="w-4 h-4" />
            Paste
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Paste at playhead (Cmd+V)</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onDelete}
            disabled={!hasSelection}
            variant="ghost"
            size="sm"
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Delete selected (Delete)</p>
        </TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-6 mx-2" />

      {/* Snap Toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onToggleSnap}
            variant="ghost"
            size="sm"
            className="gap-2"
            data-active={snapEnabled}
          >
            <Magnet className="w-4 h-4" />
            Snap
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Toggle snap to clips</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
