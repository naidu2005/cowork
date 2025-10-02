import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// This interface should match the columns in your Supabase `projects` table
import { useAuth } from '@/contexts/AuthContext';

interface Project {
  id: string;
  name: string;
  created_at: string;
  user_id: string; // Add user_id to associate projects with users
  due_date?: string | null;
  password?: string; // Make password optional as it might not always be selected
  project_members: { count: number }[];
}

interface ProjectsContextType {
  projects: Project[];
  addProject: (name: string, password?: string) => Promise<Project | null>;
  deleteProject: (id: string) => Promise<void>;
  joinProject: (id: string, password?: string) => Promise<Project | null>;
  joinRole: (projectId: string, role: string) => Promise<void>; // New function
  leaveProject: (projectId: string) => Promise<void>;
}

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);

export const ProjectsProvider = ({ children }: { children: ReactNode }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const { user } = useAuth(); // Get the current user from AuthContext

  useEffect(() => {
    if (!user) {
      setProjects([]);
      return;
    }

    const fetchProjects = async () => {
      if (!user) {
        setProjects([]);
        return;
      }

      // Fetch projects owned by the user
      const { data: ownedProjects, error: ownedError } = await supabase
        .from('projects')
        .select('*, project_members(count)')
        .eq('user_id', user.id);

      if (ownedError) {
        console.error('Error fetching owned projects:', ownedError);
        // If there's an error (like invalid session), clear projects and stop.
        setProjects([]);
        return;
      }

      // Fetch project IDs where the user is a member
      const { data: memberProjectIds, error: memberIdsError } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id);

      if (memberIdsError) {
        console.error('Error fetching member project IDs:', memberIdsError);
        // We can still proceed with owned projects, so just log the error.
      }

      const projectIds = memberProjectIds?.map(m => m.project_id) || [];
      let memberProjects: Project[] = [];

      if (projectIds.length > 0) {
        // Fetch the details of the projects the user is a member of
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('*, project_members(count)')
          .in('id', projectIds);

        if (projectsError) {
          console.error('Error fetching member projects:', projectsError);
        } else {
          memberProjects = projectsData || [];
        }
      }

      // Combine owned and member projects, removing duplicates
      const allProjects = [...(ownedProjects || []), ...memberProjects];
      const uniqueProjects = allProjects.filter(
        (project, index, self) =>
          project && index === self.findIndex((p) => p && p.id === project.id)
      );

      setProjects(uniqueProjects);
    };

    fetchProjects();

    // Set up real-time subscription
    const channel = supabase
      .channel('realtime-projects')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'projects', filter: `user_id=eq.${user.id}` }, // Filter real-time inserts
        (payload) => {
            // Also check membership for inserts
            fetchProjects();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'projects' },
        (payload) => {
          fetchProjects();
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'projects' },
        (payload) => {
          setProjects((prevProjects) => prevProjects.filter((p) => p.id !== payload.old.id));
        }
      )
      .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'project_members', filter: `user_id=eq.${user.id}` },
          (payload) => {
              fetchProjects(); // Refetch all projects if user is added to a new project
          }
      )
      .subscribe();

    // Cleanup subscription on component unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]); // Re-run effect when user changes

  const addProject = async (name: string, password?: string): Promise<Project | null> => {
    if (!user) {
      console.error('No user logged in to add project.');
      return null;
    }
    const { data, error } = await supabase
      .from('projects')
      .insert({ name, password, user_id: user.id })
      .select('*, project_members(count)');

    if (error) {
      console.error('Error adding project:', error);
      return null;
    }

    if (data) {
      const newProject = data[0];

      // Also add the creator as an admin member
      const { error: insertError } = await supabase
        .from('project_members')
        .insert({ project_id: newProject.id, user_id: user.id, role: 'admin' });

      if (insertError) {
        console.error('Error adding project creator to members:', insertError);
        // Optionally, you might want to delete the project if this fails
      }

      // The real-time subscription should handle this, but we can also add it manually
      // to ensure the UI updates immediately.
      setProjects((prevProjects) => {
        // Avoid adding duplicates if the real-time event fires quickly
        if (prevProjects.find(p => p.id === newProject.id)) {
          return prevProjects;
        }
        return [...prevProjects, newProject];
      });
      return newProject;
    }
    return null;
  };

  const deleteProject = async (id: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) {
      console.error('Error deleting project:', error);
    } else {
      setProjects((prevProjects) => prevProjects.filter((p) => p.id !== id));
    }
  };

  const joinProject = async (id: string, password?: string): Promise<Project | null> => {
    if (!user) {
      console.error('No user logged in to join project.');
      return null;
    }

    const { data, error } = await supabase.rpc('verify_project_password', {
      p_project_id: id,
      p_password: password,
    });

    if (error) {
      console.error('Error calling verify_project_password RPC:', error);
      return null;
    }

    if (data && data.length > 0) {
      const joinedProject = data[0] as Project;

      // Add the user to the project_members table
      const { error: insertError } = await supabase
        .from('project_members')
        .insert({ project_id: joinedProject.id, user_id: user.id, role: 'member' }); // default role

      if (insertError) {
        // Check for unique constraint violation, which means the user is already a member.
        // This is not necessarily an error in the context of joining.
        if (insertError.code !== '23505') {
            console.error('Error adding user to project_members:', insertError);
            // If we fail to add them as a member, we shouldn't proceed.
            return null;
        }
      }

      setProjects((prevProjects) => {
        if (prevProjects.find(p => p.id === joinedProject.id)) {
          return prevProjects;
        }
        return [...prevProjects, joinedProject];
      });
      return joinedProject;
    }

    console.error('Invalid project ID or password.');
    return null;
  };

  const joinRole = async (projectId: string, role: string) => {
    if (!user) {
      console.error('No user logged in to join role.');
      return;
    }

    const { error } = await supabase
      .from('project_members')
      .upsert({ project_id: projectId, user_id: user.id, role: role }, { onConflict: 'project_id,user_id' });

    if (error) {
      console.error('Error updating role:', error);
    } else {
      console.log(`User ${user.id} updated to role ${role} in project ${projectId}`);
    }
  };

  const leaveProject = async (projectId: string) => {
    if (!user) {
      console.error('No user logged in to leave project.');
      return;
    }

    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error leaving project:', error);
    } else {
      setProjects((prevProjects) => prevProjects.filter((p) => p.id !== projectId));
    }
  };

  return (
    <ProjectsContext.Provider value={{ projects, addProject, deleteProject, joinProject, joinRole, leaveProject }}>
      {children}
    </ProjectsContext.Provider>
  );
};

export const useProjects = () => {
  const context = useContext(ProjectsContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectsProvider');
  }
  return context;
};