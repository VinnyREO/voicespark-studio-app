import { VideoProject } from '@/types/video';
import { Volume2, Film, Type } from 'lucide-react';

interface TimelinePreviewProps {
  project: Partial<VideoProject>;
}

export function TimelinePreview({ project }: TimelinePreviewProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <h3 className="font-semibold text-foreground">Timeline</h3>
      
      <div className="space-y-3">
        {/* Audio Track */}
        <div className="flex items-center gap-3">
          <div className="w-24 flex items-center gap-2 text-sm text-muted-foreground">
            <Volume2 className="w-4 h-4" />
            <span>Audio</span>
          </div>
          <div className="flex-1 h-12 bg-secondary rounded-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/20">
              {/* Waveform placeholder */}
              <div className="flex items-center h-full gap-0.5 px-2">
                {Array.from({ length: 50 }).map((_, i) => (
                  <div 
                    key={i}
                    className="flex-1 bg-primary/60 rounded-full"
                    style={{ height: `${20 + Math.random() * 60}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Video Track */}
        <div className="flex items-center gap-3">
          <div className="w-24 flex items-center gap-2 text-sm text-muted-foreground">
            <Film className="w-4 h-4" />
            <span>Video</span>
          </div>
          <div className="flex-1 h-12 bg-secondary rounded-lg flex gap-1 p-1 overflow-hidden">
            {/* Clip placeholders */}
            {Array.from({ length: 4 }).map((_, i) => (
              <div 
                key={i}
                className="h-full bg-video/30 rounded flex-1 border border-video/50"
              />
            ))}
          </div>
        </div>
        
        {/* Captions Track */}
        <div className="flex items-center gap-3">
          <div className="w-24 flex items-center gap-2 text-sm text-muted-foreground">
            <Type className="w-4 h-4" />
            <span>Captions</span>
          </div>
          <div className="flex-1 h-8 bg-secondary rounded-lg flex gap-0.5 p-1 overflow-hidden">
            {/* Caption block placeholders */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div 
                key={i}
                className="h-full bg-foreground/20 rounded flex-1"
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Time markers */}
      <div className="flex justify-between text-xs text-muted-foreground pl-[108px]">
        <span>0:00</span>
        <span>0:30</span>
        <span>1:00</span>
        <span>1:30</span>
        <span>2:00</span>
        <span>2:30</span>
      </div>
    </div>
  );
}
