import { 
  Undo2, 
  Redo2, 
  Scissors, 
  Copy, 
  Trash2, 
  Download,
  RectangleHorizontal,
  RectangleVertical,
  Square
} from 'lucide-react';
import { EditorState } from '@/types/editor';

interface EditorToolbarProps {
  editorState: EditorState;
  onAspectRatioChange: (ratio: '16:9' | '9:16' | '1:1') => void;
  onUndo: () => void;
  onRedo: () => void;
  onSplit: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onExport: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function EditorToolbar({
  editorState,
  onAspectRatioChange,
  onUndo,
  onRedo,
  onSplit,
  onCopy,
  onDelete,
  onExport,
  canUndo,
  canRedo
}: EditorToolbarProps) {
  const aspectRatios: { value: '16:9' | '9:16' | '1:1'; icon: React.ReactNode; label: string }[] = [
    { value: '16:9', icon: <RectangleHorizontal className="w-4 h-4" />, label: 'Landscape' },
    { value: '9:16', icon: <RectangleVertical className="w-4 h-4" />, label: 'Portrait' },
    { value: '1:1', icon: <Square className="w-4 h-4" />, label: 'Square' }
  ];

  return (
    <div className="h-10 bg-card border-b border-border flex items-center justify-between px-3 flex-shrink-0">
      {/* Left: History & Edit Actions */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Undo"
        >
          <Undo2 className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Redo"
        >
          <Redo2 className="w-3.5 h-3.5 text-muted-foreground" />
        </button>

        <div className="w-px h-5 bg-border mx-1.5" />

        <button
          onClick={onSplit}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          title="Split Clip"
        >
          <Scissors className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <button
          onClick={onCopy}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          title="Copy"
        >
          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Center: Aspect Ratio */}
      <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
        {aspectRatios.map((ratio) => (
          <button
            key={ratio.value}
            onClick={() => onAspectRatioChange(ratio.value)}
            className={`
              flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all
              ${editorState.aspectRatio === ratio.value
                ? 'bg-video text-video-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
              }
            `}
            title={ratio.label}
          >
            {ratio.icon}
            <span>{ratio.value}</span>
          </button>
        ))}
      </div>

      {/* Right: Export */}
      <button
        onClick={onExport}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-video text-video-foreground font-medium text-xs hover:bg-video/90 transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        Export
      </button>
    </div>
  );
}
