import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Modal, TextInput, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useProjects } from '@/contexts/ProjectsContext';

export default function AddProjectScreen() {
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  const [projectName, setProjectName] = useState('');
  const [projectPassword, setProjectPassword] = useState('');

  const [joinProjectId, setJoinProjectId] = useState('');
  const [joinProjectPassword, setJoinProjectPassword] = useState('');

  const router = useRouter();
  const { addProject, joinProject } = useProjects();

  const validatePassword = (password: string) => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const isLongEnough = password.length > 5;
    return hasUpperCase && hasLowerCase && hasNumber && isLongEnough;
  };

  const handleCreateProject = async () => {
    if (projectName.trim() === '') {
      Alert.alert('Project Name Required', 'Please enter a name for your project.');
      return;
    }

    if (!validatePassword(projectPassword)) {
      Alert.alert(
        'Invalid Password',
        'Password must be more than 5 characters long and include at least one uppercase letter, one lowercase letter, and one number.'
      );
      return;
    }

    const newProject = await addProject(projectName, projectPassword);
    setCreateModalVisible(false);
    if (newProject) {
      router.push({ pathname: '/project-dashboard', params: { projectId: newProject.id, projectName: newProject.name } });
    }
    // Reset fields after submission
    setProjectName('');
    setProjectPassword('');
  };

  const handleJoinProject = async () => {
    if (joinProjectId.trim() !== '' && joinProjectPassword.trim() !== '') {
      const joinedProject = await joinProject(joinProjectId, joinProjectPassword);
      setJoinModalVisible(false);
      if (joinedProject) {
        router.push({ pathname: '/project-dashboard', params: { projectId: joinedProject.id, projectName: joinedProject.name, userRole: 'member' } });
      } else {
        Alert.alert('Join Failed', 'Invalid Project ID or Password.');
      }
      // Reset fields after submission
      setJoinProjectId('');
      setJoinProjectPassword('');
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Link href="/" asChild>
            <TouchableOpacity style={styles.iconButton}>
              <MaterialIcons name="close" size={30} color="#374151" />
            </TouchableOpacity>
          </Link>
          <Text style={styles.headerTitle}>New Project</Text>
          <View style={styles.headerRightPlaceholder} />
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          <TouchableOpacity style={styles.card} onPress={() => setJoinModalVisible(true)}>
            <View style={styles.cardIconContainerBlue}>
              <MaterialIcons name="group-add" size={40} color="#2563EB" />
            </View>
            <Text style={styles.cardTitle}>Join Project</Text>
            <Text style={styles.cardSubtitle}>Join an existing project with a code.</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={() => setCreateModalVisible(true)}>
            <View style={styles.cardIconContainerGreen}>
              <MaterialIcons name="add" size={40} color="#16A34A" />
            </View>
            <Text style={styles.cardTitle}>Create Project</Text>
            <Text style={styles.cardSubtitle}>Start a new project from scratch.</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Join Project Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={joinModalVisible}
        onRequestClose={() => setJoinModalVisible(false)}
      >
        <BlurView intensity={100} tint="light" style={styles.modalBackdrop}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Join Project</Text>
            <View style={styles.form}>
              <View>
                <Text style={styles.label}>Enter Project ID</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 12345678"
                  value={joinProjectId}
                  onChangeText={setJoinProjectId}
                />
              </View>
              <View>
                <Text style={styles.label}>Enter Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  secureTextEntry
                  value={joinProjectPassword}
                  onChangeText={setJoinProjectPassword}
                />
              </View>
              <View style={styles.buttonGroup}>
                <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => setJoinModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.submitButton]} onPress={handleJoinProject}>
                  <Text style={styles.submitButtonText}>Join</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* Create Project Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={createModalVisible}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <BlurView intensity={100} tint="light" style={styles.modalBackdrop}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Create Project</Text>
            <View style={styles.form}>
              <View>
                <Text style={styles.label}>Enter Project Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., My Awesome App"
                  value={projectName}
                  onChangeText={setProjectName}
                />
              </View>
              <View>
                <Text style={styles.label}>Enter Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  secureTextEntry
                  value={projectPassword}
                  onChangeText={setProjectPassword}
                />
              </View>
              <View style={styles.buttonGroup}>
                <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => setCreateModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.submitButton]} onPress={handleCreateProject}>
                  <Text style={styles.submitButtonText}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </BlurView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 30,
  },
  iconButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    flex: 1,
  },
  headerRightPlaceholder: {
    width: 40,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    paddingHorizontal: 16,
  },
  card: {
    width: '100%',
    maxWidth: 384,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardIconContainerBlue: {
    backgroundColor: '#DBEAFE',
    borderRadius: 9999,
    padding: 16,
    marginBottom: 16,
  },
  cardIconContainerGreen: {
    backgroundColor: '#D1FAE5',
    borderRadius: 9999,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
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
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
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
});