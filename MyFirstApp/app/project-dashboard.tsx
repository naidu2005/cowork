import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Image, ScrollView, Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import * as Clipboard from 'expo-clipboard';
import { useProjects } from '@/contexts/ProjectsContext';
import { useAuth } from '@/contexts/AuthContext';

// Interfaces to match Supabase table schemas
interface Project {
  id: string;
  name: string;
  due_date: string | null;
}

interface Role {
  id: string;
  name: string;
  deadline: string | null;
  project_id: string;
}



export default function ProjectDashboardScreen() {
  const { projectName, projectId, userRole } = useLocalSearchParams<{ projectName?: string, projectId?: string, userRole?: string }>();
  const router = useRouter();
  const { joinRole } = useProjects();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const [isDateModalVisible, setDateModalVisible] = useState(false);
  const [newDueDate, setNewDueDate] = useState('');

  const [isRoleModalVisible, setRoleModalVisible] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDeadline, setNewRoleDeadline] = useState('');

  

  useEffect(() => {
    if (!projectId) return;

    const fetchProjectData = async () => {
      setLoading(true);
      // Fetch project details
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) {
        console.error('Error fetching project:', projectError);
        if (projectError.code === 'PGRST116') {
          Alert.alert('Error', 'Project not found.', [{ text: 'OK', onPress: () => router.back() }]);
        }
        setProject(null);
      } else {
        setProject(projectData);
      }

      // Fetch roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('*')
        .eq('project_id', projectId);

      if (rolesError) console.error('Error fetching roles:', rolesError);
      else setRoles(rolesData || []);

      setLoading(false);
    };

    fetchProjectData();

    const projectChannel = supabase
      .channel(`project-${projectId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'projects', filter: `id=eq.${projectId}` }, (payload) => {
        setProject(payload.new as Project);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'roles', filter: `project_id=eq.${projectId}` }, () => {
        fetchProjectData(); // Refetch all data for simplicity
      })
      
      .subscribe();

    return () => {
      supabase.removeChannel(projectChannel);
    };
  }, [projectId]);

  const handleSaveDueDate = async () => {
    if (!projectId || !newDueDate) return;
    const { error } = await supabase.from('projects').update({ due_date: newDueDate }).eq('id', projectId);
    if (error) console.error('Error updating due date:', error);
    setDateModalVisible(false);
  };

  const handleCreateRole = async () => {
    if (!projectId || !newRoleName.trim() || !newRoleDeadline.trim()) return;
    const { error } = await supabase.from('roles').insert({ name: newRoleName, deadline: newRoleDeadline, project_id: projectId });
    if (error) console.error('Error creating role:', error);
    else {
      setNewRoleName('');
      setNewRoleDeadline('');
      setRoleModalVisible(false);
    }
  };

  

  const copyToClipboard = async () => {
    if (projectId) {
      await Clipboard.setStringAsync(projectId);
      Alert.alert('Copied!', 'Project ID copied to clipboard.');
    }
  };

  if (loading) {
    return <ActivityIndicator style={styles.centered} size="large" />;
  }

  

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Project Dashboard</Text>
          <View style={styles.headerRightPlaceholder} />
        </View>

        <View style={styles.mainContent}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Project Overview</Text>
            <View style={styles.projectInfoContainer}>
              <View style={styles.projectDetails}>
                <Text style={styles.projectName}>{project?.name || projectName}</Text>
                <TouchableOpacity onPress={() => {
                  if (userRole !== 'member') {
                    setNewDueDate(project?.due_date ? new Date(project.due_date).toISOString().split('T')[0] : '');
                    setDateModalVisible(true);
                  }
                }}>
                  <Text style={styles.dueDate}>Due: {project?.due_date ? new Date(project.due_date).toLocaleDateString() : 'Not set'}</Text>
                </TouchableOpacity>
                <View style={styles.projectIdContainer}>
                  <Text style={styles.projectIdLabel}>ID: </Text>
                  <Text style={styles.projectId} selectable>{projectId}</Text>
                  <TouchableOpacity onPress={copyToClipboard} style={styles.copyButton}>
                    <MaterialIcons name="content-copy" size={16} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              </View>
              <Image
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBkQRNkKqrC0pn1tSvbfZu-OzWCZ0V_g5XDmkWyK7pXKdOB7JVCUVhz9L2j1XSlkAU8PXq7mGFM5-qc6nMG0JzPY_JNiq5EEg-YOr98e2wfnY003MAkGHmyES-gMbd-fJpcTnVhwaxoh7U4BehGmHXL7O5jKhDreDdJLET-ozKQUsKH6JsCd23I2KD-ndajfLwGy0hTeBBBM7kemVYwcBxxq8iy6wS7joI0_onwOKq1WVS6rLtzIRGXa08Y40fG0mk55cCRmE7ylrts' }}
                style={styles.projectImage}
              />
            </View>
          </View>

          <View style={styles.rolesSection}>
            <Text style={styles.rolesTitle}>Team Roles</Text>
            <View style={styles.rolesList}>
              {roles.map((role) => (
                <TouchableOpacity key={role.id} style={styles.roleItem} onPress={() => router.push({ pathname: `/role/${role.id}`, params: { roleName: role.name, projectId: projectId, userRole: userRole } })}>
                  <View style={styles.roleInfo}>
                    <Text style={styles.roleName}>{role.name}</Text>
                    <Text style={styles.roleDeadline}>Deadline: {role.deadline ? new Date(role.deadline).toLocaleDateString() : 'Not set'}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
            </View>
            {userRole !== 'member' && (
              <TouchableOpacity style={styles.assignButton} onPress={() => setRoleModalVisible(true)}>
                <MaterialIcons name="add" size={24} color="white" />
                <Text style={styles.assignButtonText}>Assign Roles</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      

      {/* Change Due Date Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isDateModalVisible}
        onRequestClose={() => setDateModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Change Project Deadline</Text>
            <TextInput
              style={styles.input}
              value={newDueDate}
              onChangeText={setNewDueDate}
              placeholder="YYYY-MM-DD"
            />
            <View style={styles.buttonGroup}>
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => setDateModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.submitButton]} onPress={handleSaveDueDate}>
                <Text style={styles.submitButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Assign Role Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isRoleModalVisible}
        onRequestClose={() => setRoleModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Assign New Role</Text>
            <TextInput
              style={styles.input}
              value={newRoleName}
              onChangeText={setNewRoleName}
              placeholder="Enter role name"
            />
            <TextInput
              style={styles.input}
              value={newRoleDeadline}
              onChangeText={setNewRoleDeadline}
              placeholder="YYYY-MM-DD"
            />
            <View style={styles.buttonGroup}>
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => setRoleModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.submitButton]} onPress={handleCreateRole}>
                <Text style={styles.submitButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 30,
    backgroundColor: '#F9FAFB',
  },
  iconButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#111827',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerRightPlaceholder: {
    width: 40,
  },
  mainContent: {
    padding: 24,
    gap: 32,
  },
  card: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  projectInfoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  projectDetails: {
    gap: 4,
    flexShrink: 1,
  },
  projectName: {
    color: '#1F2937',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dueDate: {
    color: '#0284c7',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  projectIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  projectIdLabel: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: 'bold',
  },
  projectId: {
    color: '#374151',
    fontSize: 14,
    flexShrink: 1,
    marginRight: 8,
  },
  copyButton: {
    padding: 4,
  },
  projectImage: {
    width: 96,
    height: 96,
    borderRadius: 8,
    flexShrink: 0,
  },
  rolesSection: {
    paddingHorizontal: 0,
  },
  rolesTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  rolesList: {
    gap: 12,
    marginBottom: 24,
  },
  roleItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roleInfo: {
    flex: 1,
  },
  roleName: {
    color: '#1F2937',
    fontWeight: 'bold',
  },
  roleDeadline: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 4,
  },
  joinButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  joinButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  joinButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    paddingHorizontal: 24,
    backgroundColor: '#0284c7',
    borderRadius: 12,
    gap: 12,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  assignButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalView: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 384,
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  input: {
    marginTop: 4,
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontWeight: '500',
    color: '#4B5563',
  },
  submitButton: {
    backgroundColor: '#2563EB',
  },
  submitButtonText: {
    fontWeight: '500',
    color: 'white',
  },
  membersScrollView: {
    maxHeight: 200, // Or any suitable height
    width: '100%',
  },
  memberItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  memberEmail: {
    fontSize: 16,
    color: '#374151',
  },
  noMembersText: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 20,
  },
});