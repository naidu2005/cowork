import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useProjects } from '@/contexts/ProjectsContext';
import { useAuth } from '@/contexts/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';

interface RoleMember {
    user_id: string;
    users: {
        full_name: string;
    } | null;
}

interface Project {
    id: string;
    user_id: string;
    tasks_content?: string | null;
}

export default function RoleDetailsScreen() {
    const { roleId, roleName, projectId } = useLocalSearchParams<{ roleId: string, roleName: string, projectId: string }>();
    const router = useRouter();
    const { joinRole } = useProjects();
    const { user } = useAuth();

    const [members, setMembers] = useState<RoleMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [isJoining, setIsJoining] = useState(false);
    const [projectOwnerId, setProjectOwnerId] = useState<string | null>(null);
    const [tasksContent, setTasksContent] = useState<string>('');
    const [isSavingTasks, setIsSavingTasks] = useState(false);

    const fetchProjectDetails = useCallback(async () => {
        if (!projectId) return;
        const { data, error } = await supabase
            .from('projects')
            .select('user_id, tasks_content')
            .eq('id', projectId)
            .single();
        if (error) {
            console.error('Error fetching project details:', error);
        } else {
            setProjectOwnerId(data.user_id);
            setTasksContent(data.tasks_content || '');
        }
    }, [projectId]);

    const fetchMembers = useCallback(async () => {
        if (!roleId || !projectId) return;

        setLoading(true);
        
        const { data: memberIds, error: memberIdsError } = await supabase
            .from('project_members')
            .select('user_id')
            .eq('project_id', projectId)
            .eq('role', roleName);

        if (memberIdsError) {
            console.error('Error fetching role member IDs:', memberIdsError);
            setMembers([]);
            setLoading(false);
            return;
        }

        const userIds = memberIds.map(m => m.user_id);

        if (userIds.length === 0) {
            setMembers([]);
            setLoading(false);
            return;
        }

        const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds);

        if (profilesError) {
            console.error('Error fetching profiles:', profilesError);
            // Keep the old member list with user IDs as fallback
            const memberList = userIds.map(userId => ({
                user_id: userId,
                users: { full_name: userId }
            }));
            setMembers(memberList);
        } else {
            const memberList = userIds.map(userId => {
                const userProfile = profilesData.find(p => p.id === userId);
                return {
                    user_id: userId,
                    users: userProfile ? { full_name: userProfile.full_name } : { full_name: 'Unknown User' }
                };
            });
            setMembers(memberList);
        }

        setLoading(false);
    }, [roleId, projectId, roleName]);

    useEffect(() => {
        fetchProjectDetails();
        fetchMembers();
        
        const changes = supabase
          .channel(`project_members_changes_for_role_${roleId}`)
          .on('postgres_changes', { 
              event: '*', 
              schema: 'public', 
              table: 'project_members', 
              filter: `project_id=eq.${projectId}`
            }, 
            (payload) => {
                console.log('Change received!', payload)
                fetchMembers();
            }
          )
          .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'projects', 
            filter: `id=eq.${projectId}`
          }, 
          (payload) => {
              setTasksContent(payload.new.tasks_content || '');
          }
        )
          .subscribe()

        return () => {
            supabase.removeChannel(changes);
        };

    }, [fetchMembers, roleId, projectId, fetchProjectDetails]);

    const handleJoinRole = async () => {
        if (user && roleName && projectId) {
            setIsJoining(true);
            try {
                await joinRole(projectId, roleName);
            } catch (error: any) {
                if (error.message.includes('duplicate key value')) {
                    Alert.alert('Already Joined', 'You have already joined this role.');
                } else {
                    Alert.alert('Error', 'Failed to join role.');
                }
            } finally {
                setIsJoining(false);
            }
        }
    };

    const handleSaveTasks = async () => {
        if (!projectId || !user || !isAdmin) return;
        setIsSavingTasks(true);
        const { error } = await supabase
            .from('projects')
            .update({ tasks_content: tasksContent })
            .eq('id', projectId);
        if (error) {
            console.error('Error saving tasks:', error);
            Alert.alert('Error', 'Failed to save tasks.');
        } else {
            Alert.alert('Success', 'Tasks saved successfully.');
        }
        setIsSavingTasks(false);
    };

    const isUserMember = members.some(member => member.user_id === user?.id);
    const isAdmin = user?.id === projectOwnerId;

    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Role Details</Text>
                <View style={styles.headerRightPlaceholder} />
            </View>
            <ScrollView style={styles.scrollView}>
                <View style={styles.mainContent}>
                    <Text style={styles.roleName}>{roleName}</Text>
                    <View style={styles.membersSection}>
                        <Text style={styles.sectionTitle}>Members</Text>
                        {loading ? (
                            <ActivityIndicator size="large" color="#199ee1" />
                        ) : members.length > 0 ? (
                            <View style={styles.membersList}>
                                {members.map((member, index) => (
                                    <View key={index} style={styles.memberItem}>
                                        <Text style={styles.memberName}>{member.users?.full_name || 'Unnamed User'}</Text>
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <View style={styles.noMembersContainer}>
                                <Text style={styles.noMembersText}>No members joined yet.</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.tasksSection}>
                        <View style={styles.tasksContainer}>
                            <Text style={styles.tasksText}>Tasks</Text>
                            {isAdmin ? (
                                <>
                                    <TextInput
                                        style={styles.tasksTextInput}
                                        multiline
                                        placeholder="Enter tasks here..."
                                        value={tasksContent}
                                        onChangeText={setTasksContent}
                                    />
                                    <TouchableOpacity 
                                        style={[styles.saveTasksButton, isSavingTasks && styles.saveTasksButtonDisabled]}
                                        onPress={handleSaveTasks}
                                        disabled={isSavingTasks}
                                    >
                                        {isSavingTasks ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <Text style={styles.saveTasksButtonText}>Save Tasks</Text>
                                        )}
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <Text style={styles.tasksContentDisplay}>{tasksContent || 'No tasks available.'}</Text>
                            )}
                        </View>
                    </View>
                </View>
            </ScrollView>
            <View style={styles.footer}>
                <TouchableOpacity 
                    style={[styles.joinButton, (isUserMember || isJoining) && styles.joinButtonDisabled]} 
                    onPress={handleJoinRole}
                    disabled={isUserMember || isJoining}
                >
                    {isJoining ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.joinButtonText}>{isUserMember ? 'Joined' : 'Join Role'}</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#f6f7f8',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    headerRightPlaceholder: {
        width: 40,
    },
    scrollView: {
        flex: 1,
    },
    mainContent: {
        padding: 24,
    },
    roleName: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 24,
    },
    membersSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    membersList: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
    },
    memberItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    memberName: {
        fontSize: 16,
    },
    noMembersContainer: {
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderStyle: 'dashed',
    },
    noMembersText: {
        color: '#888',
    },
    tasksSection: {
        marginTop: 'auto',
        marginBottom: 24,
    },
    tasksContainer: {
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
    },
    tasksText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#555',
        marginBottom: 8,
    },
    tasksContentDisplay: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    tasksTextInput: {
        width: '100%',
        minHeight: 100,
        borderColor: '#d1d5db',
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        textAlignVertical: 'top',
        marginBottom: 12,
    },
    saveTasksButton: {
        backgroundColor: '#199ee1',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
    },
    saveTasksButtonDisabled: {
        backgroundColor: '#a9a9a9',
    },
    saveTasksButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    joinButton: {
        backgroundColor: '#199ee1',
        paddingVertical: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    joinButtonDisabled: {
        backgroundColor: '#a9a9a9',
    },
    joinButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
