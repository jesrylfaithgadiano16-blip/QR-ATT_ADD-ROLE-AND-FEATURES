import { useCallback, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import AppButton from '@/components/AppButton';
import { useAuth, signOut } from '@/lib/auth';
import { getProfile, updateProfile, type Profile } from '@/lib/profile';

export default function ProfileScreen() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draftName, setDraftName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setDraftName('');
      return;
    }

    try {
      const p = await getProfile(user.id);
      setProfile(p);
      setDraftName(p?.full_name ?? '');
    } catch (error) {
      console.error('Failed to load profile:', error);
      Alert.alert('Error', 'Unable to load your profile.');
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (!authLoading) {
        loadProfile();
      }
    }, [loadProfile, authLoading])
  );

  const handleSaveName = async () => {
    if (!user) return;

    const trimmedName = draftName.trim();

    if (!trimmedName) {
      Alert.alert('Required', 'Please enter your name.');
      return;
    }

    setSaving(true);

    try {
      const { error } = await updateProfile(user.id, {
        full_name: trimmedName,
      });

      if (error) {
        Alert.alert('Error', error);
        return;
      }

      setProfile((prev) =>
        prev ? { ...prev, full_name: trimmedName } : prev
      );

      setDraftName(trimmedName);
      setEditing(false);
      Alert.alert('Success', 'Your name has been updated.');
    } catch {
      Alert.alert('Error', 'Unable to update your name.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    if (loading) return;

    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);

            try {
              const { error } = await signOut();

              if (error) {
                Alert.alert('Error', error.message);
                return;
              }

              router.replace('/login');
            } catch (err: unknown) {
              const message =
                err instanceof Error
                  ? err.message
                  : 'Failed to sign out.';

              Alert.alert('Error', message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.value}>Loading account...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons
            name="person-circle-outline"
            size={64}
            color="#E552B9"
          />
          <Text style={styles.profileName}>Not Signed In</Text>
          <Text style={styles.pageSubtitle}>
            Please log in to view your profile.
          </Text>
          <AppButton
            title="Go to Login"
            icon="log-in-outline"
            onPress={() => router.replace('/login')}
          />
        </View>
      </SafeAreaView>
    );
  }

  const rawRole = profile?.role?.toLowerCase();

  const role =
    rawRole === 'admin'
      ? 'Admin'
      : rawRole === 'teacher'
        ? 'Teacher'
        : rawRole === 'student'
          ? 'Student'
          : 'Unknown';

  const roleColor =
    rawRole === 'admin'
      ? '#7C3AED'
      : rawRole === 'teacher'
        ? '#2563EB'
        : '#16A34A';

  const initial = (
    profile?.full_name || user.email || 'U'
  )
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Profile</Text>
        <Text style={styles.pageSubtitle}>
          Manage your account information
        </Text>

        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>

          <Text style={styles.profileName}>
            {profile?.full_name || 'Your Name'}
          </Text>

          <View
            style={[
              styles.roleBadge,
              { backgroundColor: `${roleColor}18` },
            ]}
          >
            <Text style={[styles.roleText, { color: roleColor }]}>
              {role === 'Unknown' ? 'Role not set' : role}
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Personal Information</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="person-outline" size={20} color="#E552A8" />
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.label}>Full Name</Text>

              {editing ? (
                <View style={styles.editContainer}>
                  <TextInput
                    value={draftName}
                    onChangeText={setDraftName}
                    style={styles.nameInput}
                    placeholder="Enter your name"
                    placeholderTextColor="#9299A8"
                    autoCapitalize="words"
                    editable={!saving}
                  />

                  <View style={styles.editActions}>
                    <Pressable
                      onPress={handleSaveName}
                      disabled={saving}
                      style={styles.saveButton}
                    >
                      <Text style={styles.saveText}>
                        {saving ? 'Saving...' : 'Save'}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        setDraftName(profile?.full_name ?? '');
                        setEditing(false);
                      }}
                      disabled={saving}
                      style={styles.cancelButton}
                    >
                      <Text style={styles.cancelText}>Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={styles.valueRow}>
                  <Text style={styles.value}>
                    {profile?.full_name || 'Not provided'}
                  </Text>

                  <Pressable
                    onPress={() => setEditing(true)}
                    hitSlop={10}
                  >
                    <Ionicons
                      name="create-outline"
                      size={21}
                      color="#E552B9"
                    />
                  </Pressable>
                </View>
              )}
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="mail-outline" size={20} color="#E552B4" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.label}>Email Address</Text>
              <Text style={styles.value}>{user.email || 'Not provided'}</Text>
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color="#7C3AED"
              />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.label}>Account Role</Text>
              <Text
                style={[
                  styles.value,
                  { color: roleColor, fontWeight: '700' },
                ]}
              >
                {role === 'Unknown' ? 'Role not set' : role}
              </Text>
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="finger-print-outline"
                size={20}
                color="#E552D1"
              />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.label}>User ID</Text>
              <Text style={styles.userId} selectable>
                {user.id}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.signOutContainer}>
          <AppButton
            title={loading ? 'Signing Out...' : 'Sign Out'}
            icon="log-out-outline"
            onPress={handleSignOut}
          />
        </View>

        <Text style={styles.footer}>
          QR-ATT · School Attendance System
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FC',
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 30,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#452039',
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#9F8299',
    marginTop: 5,
    marginBottom: 26,
    textAlign: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 26,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#E552C5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileName: {
    fontSize: 21,
    fontWeight: '700',
    color: '#452039',
    marginBottom: 9,
    textAlign: 'center',
  },
  roleBadge: {
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 6,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E9ECF4',
    marginBottom: 22,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#452043',
    marginBottom: 18,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 5,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF1FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
    paddingTop: 2,
  },
  label: {
    fontSize: 12,
    color: '#8991A2',
    marginBottom: 6,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4E3043',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  userId: {
    fontSize: 11,
    lineHeight: 17,
    color: '#8A697C',
  },
  separator: {
    height: 1,
    backgroundColor: '#EEF0F5',
    marginVertical: 14,
  },
  editContainer: {
    gap: 10,
  },
  nameInput: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#DDE3F3',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#4E3044',
    backgroundColor: '#FAFBFF',
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  saveButton: {
    backgroundColor: '#E552CC',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9,
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  cancelButton: {
    backgroundColor: '#F0F2F7',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 9,
  },
  cancelText: {
    color: '#806078',
    fontWeight: '600',
    fontSize: 13,
  },
  signOutContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F0DEDE',
    padding: 3,
  },
  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: '#B09AA8',
    marginTop: 26,
  },
});