import { FacelessNiche } from '@/types/video';
import { NICHE_TEMPLATES } from '@/config/videoTemplates';
import { 
  Ghost, 
  MessageSquare, 
  Search, 
  ListOrdered, 
  Flame,
  Clock,
  Brain,
  Newspaper,
  Star,
  Palette,
  Check
} from 'lucide-react';
import { ReactNode } from 'react';

const NICHE_ICONS: Record<FacelessNiche, ReactNode> = {
  'scary-stories': <Ghost className="w-5 h-5" />,
  'reddit-stories': <MessageSquare className="w-5 h-5" />,
  'true-crime': <Search className="w-5 h-5" />,
  'facts-top10': <ListOrdered className="w-5 h-5" />,
  'motivation': <Flame className="w-5 h-5" />,
  'history': <Clock className="w-5 h-5" />,
  'conspiracy': <Brain className="w-5 h-5" />,
  'ai-news': <Newspaper className="w-5 h-5" />,
  'celebrity-gossip': <Star className="w-5 h-5" />,
  'custom': <Palette className="w-5 h-5" />
};

interface NicheSelectorProps {
  selected: FacelessNiche;
  onSelect: (niche: FacelessNiche) => void;
}

export function NicheSelector({ selected, onSelect }: NicheSelectorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {NICHE_TEMPLATES.map((template) => {
        const isSelected = selected === template.niche;
        
        return (
          <button
            key={template.id}
            onClick={() => onSelect(template.niche)}
            className={`
              relative p-4 rounded-xl border transition-all text-left overflow-hidden group
              ${isSelected 
                ? 'border-video bg-video/10 shadow-lg shadow-video/10' 
                : 'border-border bg-card hover:border-muted-foreground'
              }
            `}
          >
            {/* Gradient Background on Hover/Selected */}
            <div className={`absolute inset-0 bg-gradient-to-br from-video/20 to-transparent opacity-0 transition-opacity ${isSelected ? 'opacity-100' : 'group-hover:opacity-50'}`} />
            
            <div className="relative flex flex-col gap-2">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? 'bg-video text-video-foreground' : 'bg-secondary text-muted-foreground'}`}>
                {NICHE_ICONS[template.niche]}
              </div>
              
              <p className="font-semibold text-foreground">{template.name}</p>
              <p className="text-xs text-muted-foreground">
                {template.visualDefaults.source === 'gameplay' ? 'Gameplay background' : 'Stock footage'}
              </p>
            </div>

            {isSelected && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-video flex items-center justify-center">
                <Check className="w-3 h-3 text-video-foreground" />
              </div>
            )}
          </button>
        );
      })}
      
      {/* Custom Option */}
      <button
        onClick={() => onSelect('custom')}
        className={`
          relative p-4 rounded-xl border border-dashed transition-all text-left
          ${selected === 'custom' 
            ? 'border-video bg-video/10' 
            : 'border-border hover:border-muted-foreground'
          }
        `}
      >
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selected === 'custom' ? 'bg-video text-video-foreground' : 'bg-secondary text-muted-foreground'}`}>
          <Palette className="w-5 h-5" />
        </div>
        <p className="font-semibold text-foreground mt-2">Custom</p>
        <p className="text-xs text-muted-foreground">Build your own style</p>
      </button>
    </div>
  );
}
