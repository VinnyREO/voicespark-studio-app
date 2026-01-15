import { useRef, useCallback, useEffect, useState } from 'react';
import { countWords, countCharacters, highlightStyleTags } from '@/utils/styleTagProcessor';
import { StyleTagBar } from './StyleTagBar';
import { FileText, Clipboard, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ScriptEditorProps {
  script: string;
  onChange: (script: string) => void;
}

export function ScriptEditor({ script, onChange }: ScriptEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [selectionStart, setSelectionStart] = useState(0);

  const wordCount = countWords(script);
  const charCount = countCharacters(script);

  const handleInsertTag = useCallback(
    (openTag: string, closeTag?: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = script.substring(start, end);

      let newText: string;
      let newCursorPos: number;

      if (closeTag && selectedText) {
        newText = script.substring(0, start) + openTag + selectedText + closeTag + script.substring(end);
        newCursorPos = start + openTag.length + selectedText.length + closeTag.length;
      } else if (closeTag) {
        newText = script.substring(0, start) + openTag + closeTag + script.substring(end);
        newCursorPos = start + openTag.length;
      } else {
        newText = script.substring(0, start) + openTag + script.substring(end);
        newCursorPos = start + openTag.length;
      }

      onChange(newText);
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    },
    [script, onChange]
  );

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      onChange(script + text);
      toast.success('Pasted from clipboard');
    } catch (err) {
      toast.error('Failed to paste from clipboard');
    }
  }, [script, onChange]);

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.name.endsWith('.txt')) {
        toast.error('Please upload a .txt file');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        onChange(content);
        toast.success(`Loaded ${file.name}`);
      };
      reader.onerror = () => toast.error('Failed to read file');
      reader.readAsText(file);
    },
    [onChange]
  );

  const syncScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <FileText className="w-4 h-4" />
          <span className="text-sm font-medium">Script</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePaste}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Clipboard className="w-4 h-4" />
            Paste
          </Button>
          <label>
            <input
              type="file"
              accept=".txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <span>
                <Upload className="w-4 h-4" />
                Upload
              </span>
            </Button>
          </label>
        </div>
      </div>

      <div className="relative rounded-xl border border-border bg-background overflow-hidden">
        {/* Syntax highlighting layer */}
        <div
          ref={highlightRef}
          className="absolute inset-0 p-4 font-mono text-sm leading-relaxed pointer-events-none overflow-hidden whitespace-pre-wrap break-words"
          style={{ color: 'transparent' }}
          dangerouslySetInnerHTML={{ __html: highlightStyleTags(script) || '&nbsp;' }}
          aria-hidden="true"
        />
        
        {/* Actual textarea */}
        <textarea
          ref={textareaRef}
          value={script}
          onChange={(e) => onChange(e.target.value)}
          onScroll={syncScroll}
          onSelect={(e) => setSelectionStart((e.target as HTMLTextAreaElement).selectionStart)}
          placeholder="Paste your script here... Use style tags like [whisper]text[/whisper] to add voice styling."
          className="relative w-full min-h-[280px] p-4 font-mono text-sm leading-relaxed bg-transparent resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-xl text-foreground placeholder:text-muted-foreground/50 caret-primary"
          spellCheck={false}
        />
      </div>

      <div className="flex items-center justify-between">
        <StyleTagBar onInsertTag={handleInsertTag} />
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{wordCount} words</span>
          <span>{charCount} chars</span>
        </div>
      </div>
    </div>
  );
}
