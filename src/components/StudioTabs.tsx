import { Mic, Video, Sparkles } from 'lucide-react';

export type StudioTab = 'voice' | 'video';

interface StudioTabsProps {
  activeTab: StudioTab;
  onTabChange: (tab: StudioTab) => void;
  hasVoiceover?: boolean;
}

export function StudioTabs({ activeTab, onTabChange, hasVoiceover }: StudioTabsProps) {
  return (
    <div className="flex items-center gap-2 p-1 bg-secondary rounded-lg">
      <button
        onClick={() => onTabChange('voice')}
        className={`
          flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all
          ${activeTab === 'voice'
            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }
        `}
      >
        <Mic className="w-4 h-4" />
        VoiceForge
      </button>
      
      <button
        onClick={() => onTabChange('video')}
        className={`
          flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all relative
          ${activeTab === 'video'
            ? 'bg-video text-video-foreground shadow-lg shadow-video/20'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }
        `}
      >
        <Video className="w-4 h-4" />
        VideoForge
        {hasVoiceover && activeTab !== 'video' && (
          <Sparkles className="w-3 h-3 text-video absolute -top-1 -right-1 animate-pulse" />
        )}
      </button>
    </div>
  );
}
