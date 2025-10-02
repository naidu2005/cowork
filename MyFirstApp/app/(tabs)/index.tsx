import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, ScrollView, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useProjects } from '@/contexts/ProjectsContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Project {
  id: string;
  name: string;
  user_id: string;
  due_date?: string | null;
  project_members?: { count: number }[];
}

const DefaultAvatar = () => (
  <View style={styles.defaultAvatar}>
    <MaterialIcons name="person" size={20} color="#fff" />
  </View>
);

const ProjectCard = ({ project, onPress, onLongPress, userRole }: { project: Project, onPress: () => void, onLongPress: () => void, userRole: string }) => {
  const memberCount = project.project_members?.[0]?.count || 0;

  const renderAvatars = () => {
    const avatars = [];
    const maxAvatars = 3;
    const numToRender = Math.min(memberCount, maxAvatars);

    for (let i = 0; i < numToRender; i++) {
      avatars.push(<DefaultAvatar key={i} />);
    }
    return avatars;
  };

  return (
    <TouchableOpacity style={styles.projectCard} onPress={onPress} onLongPress={onLongPress}>
      <Text style={styles.cardTitle}>{project.name}</Text>
      <Text style={styles.cardDueDate}>Due: {project.due_date ? new Date(project.due_date).toLocaleDateString() : 'Not set'}</Text>
      <View style={styles.cardFooter}>
        <View style={styles.avatarContainer}>
          {renderAvatars()}
        </View>
        <Text style={userRole === 'admin' ? styles.adminStatus : styles.memberStatus}>{userRole}</Text>
      </View>
    </TouchableOpacity>
  );
};

export default function HomeScreen() {
  const { projects, deleteProject, leaveProject } = useProjects();
  const { user } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/auth/sign-up');
  };

  const handleForceSignOut = async () => {
    await supabase.auth.signOut();
    Alert.alert("Forced Sign Out", "The session has been cleared.");
  };

  const navigateToProject = (project: Project) => {
    const userRole = project.user_id === user?.id ? 'owner' : 'member';
    router.push({ pathname: '/project-dashboard', params: { projectName: project.name, projectId: project.id, userRole } });
  };

  const handleLongPress = (project: Project) => {
    const userRole = project.user_id === user?.id ? 'admin' : 'member';

    if (userRole === 'admin') {
      Alert.alert(
        'Delete Project',
        `Are you sure you want to delete "${project.name}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', onPress: () => deleteProject(project.id), style: 'destructive' },
        ],
        { cancelable: true }
      );
    } else {
      Alert.alert(
        'Leave Project',
        `Are you sure you want to leave "${project.name}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Leave', onPress: () => leaveProject(project.id), style: 'destructive' },
        ],
        { cancelable: true }
      );
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity style={styles.iconButton} onPress={handleSignOut}>
            <MaterialIcons name="logout" size={24} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handleForceSignOut}>
            <MaterialIcons name="delete-forever" size={24} color="red" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>My Projects</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView style={styles.mainContent}>
        <View style={styles.projectsContainer}>
          {projects && projects.length > 0 ? (
            projects.filter(p => p).map((project) => {
              const userRole = project.user_id === user?.id ? 'admin' : 'member';
              return (
                <ProjectCard
                  key={project.id}
                  project={project}
                  userRole={userRole}
                  onPress={() => navigateToProject(project)}
                  onLongPress={() => handleLongPress(project)}
                />
              );
            })
          ) : (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateTitle}>No projects yet</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Link href="/add-project" asChild>
          <TouchableOpacity style={styles.addButton}>
            <MaterialIcons name="add" size={24} color="white" />
            <Text style={styles.addButtonText}>Add New Project</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  iconButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: -24,
  },
  headerRightPlaceholder: {
    width: 40,
  },
  mainContent: {
    flex: 1,
    padding: 16,
  },
  projectsContainer: {
    paddingBottom: 100, // To avoid being hidden by the join button
  },
  projectCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  cardDueDate: {
    marginTop: 4,
    fontSize: 14,
    color: '#6b7280',
  },
  cardFooter: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarContainer: {
    flexDirection: 'row',
    marginLeft: 6,
  },
  defaultAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    marginLeft: -8,
  },
  adminStatus: {
    fontSize: 14,
    fontWeight: '500',
    color: '#059669',
    textTransform: 'capitalize',
  },
  memberStatus: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: '50%',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4b5563',
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    width: '45%',
    backgroundColor: '#137fec',
    borderRadius: 9999,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
