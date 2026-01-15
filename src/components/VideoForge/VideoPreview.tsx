import { VideoProject } from '@/types/video';
import { Play, Pause, SkipBack, SkipForward, Maximize2 } from 'lucide-react';
import { useState } from 'react';

interface VideoPreviewProps {
  project: Partial<VideoProject>;
}

export function VideoPreview({ project }: VideoPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <h3 className="font-semibold text-foreground">Preview</h3>
      
      {/* Video Player Area */}
      <div className="space-y-3">
        {/* Placeholder for actual video */}
        <div className="aspect-video bg-background rounded-lg flex items-center justify-center border border-border">
          <p className="text-muted-foreground text-sm">Video preview will render here</p>
        </div>
        
        {/* Playback Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-10 h-10 rounded-full bg-video flex items-center justify-center text-video-foreground hover:bg-video/90 transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <button className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <SkipForward className="w-4 h-4" />
            </button>
            
            {/* Progress Bar */}
            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden mx-2">
              <div className="h-full w-1/3 bg-video rounded-full" />
            </div>
            
            <span className="text-xs text-muted-foreground">0:00 / 2:30</span>
            
            <button className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
