import { 
  Scissors, 
  Trash2, 
  Copy, 
  ClipboardPaste, 
  ChevronLeft, 
  ChevronRight,
  Magnet,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Gauge,
  ArrowLeftToLine,
  ArrowRightToLine,
  SplitSquareHorizontal,
  Layers,
  MoveHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ClipToolbarProps {
  hasSelection: boolean;
  hasClipboard: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onSplit: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onMoveToStart: () => void;
  onMoveToEnd: () => void;
  onNudgeLeft: () => void;
  onNudgeRight: () => void;
}

export function ClipToolbar({
  hasSelection,
  hasClipboard,
  canUndo,
  canRedo,
  onSplit,
  onDelete,
  onCopy,
  onPaste,
  onDuplicate,
  onUndo,
  onRedo,
  onMoveToStart,
  onMoveToEnd,
  onNudgeLeft,
  onNudgeRight,
}: ClipToolbarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-7 flex items-center gap-0.5 px-2 bg-muted/30 border-b border-border/50 flex-shrink-0">
        {/* History */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onUndo}
                disabled={!canUndo}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Undo <kbd className="ml-1 text-xs opacity-60">⌘Z</kbd></p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onRedo}
                disabled={!canRedo}
              >
                <RotateCw className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Redo <kbd className="ml-1 text-xs opacity-60">⌘⇧Z</kbd></p>
            </TooltipContent>
          </Tooltip>
        </div>
        
        <Separator orientation="vertical" className="h-4 mx-1" />
        
        {/* Clip Editing */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onSplit}
                disabled={!hasSelection}
              >
                <Scissors className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Split <kbd className="ml-1 text-xs opacity-60">S</kbd></p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive hover:text-destructive"
                onClick={onDelete}
                disabled={!hasSelection}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Delete <kbd className="ml-1 text-xs opacity-60">⌫</kbd></p>
            </TooltipContent>
          </Tooltip>
        </div>
        
        <Separator orientation="vertical" className="h-4 mx-1" />
        
        {/* Clipboard */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onCopy}
                disabled={!hasSelection}
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Copy <kbd className="ml-1 text-xs opacity-60">⌘C</kbd></p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onPaste}
                disabled={!hasClipboard}
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Paste <kbd className="ml-1 text-xs opacity-60">⌘V</kbd></p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onDuplicate}
                disabled={!hasSelection}
              >
                <Layers className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Duplicate</p>
            </TooltipContent>
          </Tooltip>
        </div>
        
        <Separator orientation="vertical" className="h-4 mx-1" />
        
        {/* Position/Nudge */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onMoveToStart}
                disabled={!hasSelection}
              >
                <ArrowLeftToLine className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Move to Start</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onNudgeLeft}
                disabled={!hasSelection}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Nudge Left</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onNudgeRight}
                disabled={!hasSelection}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Nudge Right</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onMoveToEnd}
                disabled={!hasSelection}
              >
                <ArrowRightToLine className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Move to End</p>
            </TooltipContent>
          </Tooltip>
        </div>
        
        {/* Spacer */}
        <div className="flex-1" />
        
        {/* Quick Help - compact */}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="hidden md:inline">
            <kbd className="px-1 py-0.5 bg-muted rounded">Space</kbd> Play
          </span>
          <span className="hidden lg:inline">
            <kbd className="px-1 py-0.5 bg-muted rounded">←→</kbd> Seek
          </span>
          <span className="hidden xl:inline">
            <kbd className="px-1 py-0.5 bg-muted rounded">Shift</kbd> No Snap
          </span>
        </div>
      </div>
    </TooltipProvider>
  );
}
