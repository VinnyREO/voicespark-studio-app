import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut, FolderOpen, Video, Mic } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getProject } from '@/services/projectService';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, signOut } = useAuth();
  const [projectName, setProjectName] = useState<string>('');

  const projectId = searchParams.get('project');
  const isVoiceForge = location.pathname === '/voiceforge';
  const isVideoForge = location.pathname === '/videoforge';

  // Load project name if we're in a project
  useEffect(() => {
    if (!projectId) {
      setProjectName('');
      return;
    }

    const loadProject = async () => {
      try {
        const project = await getProject(projectId);
        setProjectName(project.name);
      } catch (error) {
        console.error('[Header] Failed to load project:', error);
      }
    };

    loadProject();
  }, [projectId]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/signin');
  };

  const userInitials = user?.email?.slice(0, 2).toUpperCase() || '??';
  const userName = user?.user_metadata?.full_name || user?.email || 'User';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/projects" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center">
            <span className="text-2xl">🎤</span>
          </div>
          <div>
            <h1 className="text-xl font-bold">VoiceSpark Studio</h1>
            <p className="text-xs text-muted-foreground">
              {projectName || 'YouTube Video Creation'}
            </p>
          </div>
        </Link>

        <nav className="flex items-center gap-4">
          <Link
            to="/projects"
            className="text-sm hover:text-cyan-500 transition-colors flex items-center gap-1"
          >
            <FolderOpen className="w-4 h-4" />
            Projects
          </Link>

          {projectId ? (
            <>
              <Link
                to={`/voiceforge?project=${projectId}`}
                className={`text-sm hover:text-cyan-500 transition-colors flex items-center gap-1 ${
                  isVoiceForge ? 'text-cyan-500 font-semibold' : ''
                }`}
              >
                <Mic className="w-4 h-4" />
                VoiceForge
              </Link>
              <Link
                to={`/videoforge?project=${projectId}`}
                className={`text-sm hover:text-purple-500 transition-colors flex items-center gap-1 ${
                  isVideoForge ? 'text-purple-500 font-semibold' : ''
                }`}
              >
                <Video className="w-4 h-4" />
                VideoForge
              </Link>
            </>
          ) : (
            <>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Mic className="w-4 h-4" />
                VoiceForge
              </span>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Video className="w-4 h-4" />
                VideoForge
              </span>
            </>
          )}
        </nav>

        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
                <span className="max-w-[100px] truncate">{userName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{userName}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/projects')}>
                <FolderOpen className="mr-2 h-4 w-4" />
                <span>My Projects</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
