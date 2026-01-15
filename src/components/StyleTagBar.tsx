import { STYLE_TAGS } from '@/utils/styleTagProcessor';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface StyleTagBarProps {
  onInsertTag: (openTag: string, closeTag?: string) => void;
}

export function StyleTagBar({ onInsertTag }: StyleTagBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">Style Tags:</span>
        {STYLE_TAGS.slice(0, isExpanded ? STYLE_TAGS.length : 4).map((tag) => (
          <Tooltip key={tag.name}>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onInsertTag(tag.openTag, tag.closeTag)}
                className={`h-7 px-2 font-mono text-xs style-tag-${tag.name} bg-secondary/50 border-border hover:bg-secondary`}
              >
                [{tag.name}]
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="font-medium">{tag.description}</p>
              <p className="text-xs text-muted-foreground mt-1 font-mono">{tag.example}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-7 px-2 text-muted-foreground hover:text-foreground"
        >
          {isExpanded ? (
            <>
              Less <ChevronUp className="w-3 h-3 ml-1" />
            </>
          ) : (
            <>
              +{STYLE_TAGS.length - 4} more <ChevronDown className="w-3 h-3 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
