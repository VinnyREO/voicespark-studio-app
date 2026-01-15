import { VideoProject } from '@/types/video';
import { Download, Youtube, Settings } from 'lucide-react';
import { useState } from 'react';

interface ExportPanelProps {
  project: Partial<VideoProject>;
}

export function ExportPanel({ project }: ExportPanelProps) {
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [quality, setQuality] = useState<'720p' | '1080p' | '4k'>('1080p');

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-semibold text-foreground">Export Settings</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Aspect Ratio */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Aspect Ratio</label>
          <div className="flex gap-1">
            {(['16:9', '9:16', '1:1'] as const).map((ratio) => (
              <button
                key={ratio}
                onClick={() => setAspectRatio(ratio)}
                className={`
                  flex-1 py-2 rounded-lg text-sm font-medium transition-all
                  ${aspectRatio === ratio 
                    ? 'bg-video text-video-foreground' 
                    : 'bg-secondary text-muted-foreground hover:bg-muted'
                  }
                `}
              >
                {ratio}
              </button>
            ))}
          </div>
        </div>
        
        {/* Quality */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Quality</label>
          <div className="flex gap-1">
            {(['720p', '1080p', '4k'] as const).map((q) => (
              <button
                key={q}
                onClick={() => setQuality(q)}
                className={`
                  flex-1 py-2 rounded-lg text-sm font-medium transition-all
                  ${quality === q 
                    ? 'bg-video text-video-foreground' 
                    : 'bg-secondary text-muted-foreground hover:bg-muted'
                  }
                `}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Export Buttons */}
      <div className="flex gap-3 pt-2">
        <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-video text-video-foreground font-medium hover:bg-video/90 transition-colors">
          <Download className="w-4 h-4" />
          Download MP4
        </button>
        
        <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-destructive text-destructive-foreground font-medium hover:bg-destructive/90 transition-colors">
          <Youtube className="w-4 h-4" />
          Upload to YouTube
        </button>
      </div>
    </div>
  );
}
