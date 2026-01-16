import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { listProjects, createProject, deleteProject, Project } from '@/services/projectService';
import { getSharedProjects } from '@/services/teamService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TeamManagementDialog } from '@/components/team/TeamManagementDialog';
import { toast } from 'sonner';
import { Plus, Video, Trash2, Users, Globe, FolderOpen, Eye, Edit } from 'lucide-react';

interface SharedProject {
  id: string;
  name: string;
  owner_id: string;
  updated_at: string;
  access_type: 'workspace' | 'project';
  role: 'editor' | 'viewer';
}

export function Projects() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [sharedProjects, setSharedProjects] = useState<SharedProject[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Start false, set true when fetching
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('my-projects');

  useEffect(() => {
    // Wait for auth to finish loading before fetching projects
    if (authLoading) return;

    // If not authenticated, redirect to login
    if (!user) {
      navigate('/login');
      return;
    }

    // Fetch projects when auth is ready and user is logged in
    setIsLoading(true);
    loadProjects();
  }, [authLoading, user, navigate]);

  const loadProjects = async () => {
    try {
      const [ownProjects, shared] = await Promise.all([
        listProjects(),
        getSharedProjects().catch(() => []), // Gracefully handle if team_members table doesn't exist yet
      ]);
      setProjects(ownProjects);
      setSharedProjects(shared);
    } catch (error) {
      console.error('[Projects] Failed to load projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setIsCreating(true);
    try {
      const projectId = await createProject(newProjectName);
      toast.success('Project created!');
      setDialogOpen(false);
      setNewProjectName('');
      navigate(`/videoforge?project=${projectId}`);
    } catch (error) {
      console.error('[Projects] Failed to create project:', error);
      toast.error('Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenProject = (projectId: string) => {
    navigate(`/videoforge?project=${projectId}`);
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!confirm(`Delete "${projectName}"? This cannot be undone.`)) return;

    try {
      await deleteProject(projectId);
      toast.success('Project deleted');
      loadProjects();
    } catch (error) {
      console.error('[Projects] Failed to delete project:', error);
      toast.error('Failed to delete project');
    }
  };

  // Show loading while auth or projects are loading
  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading projects...</p>
      </div>
    );
  }

  const renderProjectCard = (project: Project, isOwner: boolean = true) => (
    <Card key={project.id} className="relative group">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{project.name}</CardTitle>
            <CardDescription>
              Last edited: {new Date(project.updated_at).toLocaleDateString()}
            </CardDescription>
          </div>
          {!isOwner && (
            <Badge variant="secondary" className="text-xs">
              Shared
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleOpenProject(project.id)}
        >
          Open Project
        </Button>
        {isOwner && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-destructive"
            onClick={() => handleDeleteProject(project.id, project.name)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        )}
      </CardContent>
    </Card>
  );

  const renderSharedProjectCard = (project: SharedProject) => (
    <Card key={project.id} className="relative group">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{project.name}</CardTitle>
            <CardDescription>
              Last edited: {new Date(project.updated_at).toLocaleDateString()}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            {project.access_type === 'workspace' ? (
              <Badge variant="outline" className="text-xs gap-1">
                <Globe className="w-3 h-3" />
                Workspace
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs gap-1">
                <FolderOpen className="w-3 h-3" />
                Project
              </Badge>
            )}
            <Badge
              variant={project.role === 'editor' ? 'default' : 'secondary'}
              className="text-xs gap-1"
            >
              {project.role === 'editor' ? (
                <Edit className="w-3 h-3" />
              ) : (
                <Eye className="w-3 h-3" />
              )}
              {project.role}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleOpenProject(project.id)}
        >
          Open Project
        </Button>
      </CardContent>
    </Card>
  );

  const EmptyState = ({ isShared = false }: { isShared?: boolean }) => (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        {isShared ? (
          <>
            <Users className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No shared projects</h3>
            <p className="text-muted-foreground mb-4 text-center">
              When teammates share projects with you, they'll appear here
            </p>
          </>
        ) : (
          <>
            <Video className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first project to get started
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto pt-24 pb-8 px-4">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">
            Create and manage your video projects
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TeamManagementDialog />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="project-name">Project Name</Label>
                  <Input
                    id="project-name"
                    placeholder="My Awesome Video"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Project'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="my-projects" className="gap-2">
            <Video className="w-4 h-4" />
            My Projects ({projects.length})
          </TabsTrigger>
          <TabsTrigger value="shared" className="gap-2">
            <Users className="w-4 h-4" />
            Shared with Me ({sharedProjects.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-projects">
          {projects.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => renderProjectCard(project, true))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="shared">
          {sharedProjects.length === 0 ? (
            <EmptyState isShared />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sharedProjects.map((project) => renderSharedProjectCard(project))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
