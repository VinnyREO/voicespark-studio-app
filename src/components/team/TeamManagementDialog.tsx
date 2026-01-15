import { useState, useEffect } from 'react';
import { Users, UserPlus, Globe, FolderOpen, X, Crown, Edit, Eye, Mail, Check, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  getTeammates,
  inviteTeammate,
  removeTeammate,
  getPendingInvitations,
  getReceivedInvitations,
  acceptInvitation,
  declineInvitation,
  TeamMember,
  AccessScope,
  TeamRole,
} from '@/services/teamService';
import { listProjects, Project } from '@/services/projectService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function TeamManagementDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [teammates, setTeammates] = useState<TeamMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<TeamMember[]>([]);
  const [receivedInvitations, setReceivedInvitations] = useState<TeamMember[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Invite form state
  const [email, setEmail] = useState('');
  const [accessScope, setAccessScope] = useState<AccessScope>('workspace');
  const [role, setRole] = useState<TeamRole>('editor');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  async function loadData() {
    setIsLoading(true);
    try {
      const [teammatesData, pendingData, receivedData, projectsData] = await Promise.all([
        getTeammates(),
        getPendingInvitations(),
        getReceivedInvitations(),
        listProjects(),
      ]);
      setTeammates(teammatesData.filter(t => t.invitation_status === 'accepted'));
      setPendingInvitations(pendingData);
      setReceivedInvitations(receivedData);
      setProjects(projectsData);
    } catch (error) {
      console.error('Failed to load team data:', error);
      toast.error('Failed to load team data');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleInvite() {
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (accessScope === 'project' && selectedProjects.length === 0) {
      toast.error('Please select at least one project');
      return;
    }

    setIsInviting(true);
    try {
      await inviteTeammate({
        email: email.trim(),
        accessScope,
        role,
        projectIds: accessScope === 'project' ? selectedProjects : undefined,
      });

      toast.success(`Invitation sent to ${email}`);
      setEmail('');
      setSelectedProjects([]);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  }

  async function handleRemove(teammate: TeamMember) {
    const displayName = teammate.member_email || 'this teammate';
    if (!confirm(`Remove ${displayName} from your team?`)) return;

    try {
      await removeTeammate(teammate.id);
      toast.success('Teammate removed');
      loadData();
    } catch (error) {
      toast.error('Failed to remove teammate');
    }
  }

  async function handleAcceptInvitation(invitation: TeamMember) {
    try {
      await acceptInvitation(invitation.id);
      toast.success('Invitation accepted');
      loadData();
    } catch (error) {
      toast.error('Failed to accept invitation');
    }
  }

  async function handleDeclineInvitation(invitation: TeamMember) {
    try {
      await declineInvitation(invitation.id);
      toast.success('Invitation declined');
      loadData();
    } catch (error) {
      toast.error('Failed to decline invitation');
    }
  }

  function toggleProject(projectId: string) {
    setSelectedProjects(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  }

  const roleIcon = (memberRole: string) => {
    switch (memberRole) {
      case 'owner': return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'editor': return <Edit className="w-4 h-4 text-blue-500" />;
      case 'viewer': return <Eye className="w-4 h-4 text-gray-500" />;
      default: return null;
    }
  };

  // Group teammates by access scope
  const workspaceTeammates = teammates.filter(t => t.access_scope === 'workspace');
  const projectTeammates = teammates.filter(t => t.access_scope === 'project');

  const totalPending = pendingInvitations.length + receivedInvitations.length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Users className="w-4 h-4 mr-2" />
          Team
          {totalPending > 0 && (
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
              {totalPending}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Team Management</DialogTitle>
          <DialogDescription>
            Invite teammates to collaborate on your projects
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="invite" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="invite">Invite</TabsTrigger>
            <TabsTrigger value="members">
              Members ({teammates.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              Sent ({pendingInvitations.length})
            </TabsTrigger>
            <TabsTrigger value="received">
              Received ({receivedInvitations.length})
            </TabsTrigger>
          </TabsList>

          {/* INVITE TAB */}
          <TabsContent value="invite" className="flex-1 overflow-auto">
            <div className="space-y-4 p-1">
              {/* Email Input */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="teammate@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* Access Scope Selection */}
              <div className="space-y-2">
                <Label>Access Type</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div
                    className={cn(
                      'p-4 border rounded-lg cursor-pointer transition-colors',
                      accessScope === 'workspace'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                    onClick={() => setAccessScope('workspace')}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="w-5 h-5" />
                      <span className="font-medium">All Projects</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Access to all current and future projects
                    </p>
                  </div>
                  <div
                    className={cn(
                      'p-4 border rounded-lg cursor-pointer transition-colors',
                      accessScope === 'project'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                    onClick={() => setAccessScope('project')}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <FolderOpen className="w-5 h-5" />
                      <span className="font-medium">Specific Projects</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Choose which projects to share
                    </p>
                  </div>
                </div>
              </div>

              {/* Project Selection (if project-based) */}
              {accessScope === 'project' && (
                <div className="space-y-2">
                  <Label>Select Projects</Label>
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {projects.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground">No projects yet</p>
                    ) : (
                      projects.map((project) => (
                        <div
                          key={project.id}
                          className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                          onClick={() => toggleProject(project.id)}
                        >
                          <Checkbox
                            checked={selectedProjects.includes(project.id)}
                            onCheckedChange={() => toggleProject(project.id)}
                          />
                          <span>{project.name}</span>
                        </div>
                      ))
                    )}
                  </div>
                  {selectedProjects.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {selectedProjects.length} project(s) selected
                    </p>
                  )}
                </div>
              )}

              {/* Role Selection */}
              <div className="space-y-2">
                <Label>Permission Level</Label>
                <Select value={role} onValueChange={(v) => setRole(v as TeamRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editor">
                      <div className="flex items-center gap-2">
                        <Edit className="w-4 h-4" />
                        <span>Editor - Can view and edit</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="viewer">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        <span>Viewer - Can only view</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Invite Button */}
              <Button
                onClick={handleInvite}
                disabled={isInviting || !email.trim()}
                className="w-full"
              >
                {isInviting ? (
                  'Sending Invitation...'
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* MEMBERS TAB */}
          <TabsContent value="members" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[400px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              ) : teammates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No team members yet</p>
                  <p className="text-sm">Invite teammates to collaborate</p>
                </div>
              ) : (
                <div className="space-y-4 p-1">
                  {/* Workspace-wide teammates */}
                  {workspaceTeammates.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        All Projects Access
                      </h4>
                      <div className="space-y-2">
                        {workspaceTeammates.map((teammate) => (
                          <div
                            key={teammate.id}
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              {roleIcon(teammate.role)}
                              <div>
                                <p className="font-medium">{teammate.member_email}</p>
                                <p className="text-xs text-muted-foreground capitalize">
                                  {teammate.role}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemove(teammate)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Project-specific teammates */}
                  {projectTeammates.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                        <FolderOpen className="w-4 h-4" />
                        Project-Specific Access
                      </h4>
                      <div className="space-y-2">
                        {projectTeammates.map((teammate) => (
                          <div
                            key={teammate.id}
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              {roleIcon(teammate.role)}
                              <div>
                                <p className="font-medium">{teammate.member_email}</p>
                                <p className="text-xs text-muted-foreground">
                                  {teammate.project?.name || 'Unknown project'} · {teammate.role}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemove(teammate)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* PENDING (SENT) TAB */}
          <TabsContent value="pending" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[400px]">
              {pendingInvitations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No pending invitations</p>
                </div>
              ) : (
                <div className="space-y-2 p-1">
                  {pendingInvitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-yellow-600" />
                        <div>
                          <p className="font-medium">{invitation.member_email}</p>
                          <p className="text-xs text-muted-foreground">
                            {invitation.access_scope === 'workspace'
                              ? 'All projects'
                              : invitation.project?.name || 'Specific project'}
                            {' · '}
                            {invitation.role}
                            {' · '}
                            Invited {new Date(invitation.invited_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(invitation)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* RECEIVED INVITATIONS TAB */}
          <TabsContent value="received" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[400px]">
              {receivedInvitations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No invitations received</p>
                </div>
              ) : (
                <div className="space-y-2 p-1">
                  {receivedInvitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">
                          {invitation.access_scope === 'workspace'
                            ? 'All projects'
                            : invitation.project?.name || 'Project invitation'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {invitation.role} access ·
                          Invited {new Date(invitation.invited_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeclineInvitation(invitation)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAcceptInvitation(invitation)}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Accept
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
