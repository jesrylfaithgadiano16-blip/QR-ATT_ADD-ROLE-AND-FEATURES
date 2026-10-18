import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/lib/auth';
import {
  getAttendanceHistory,
  getTeacherEventAttendance,
  type AttendanceRecord,
  type TeacherEventAttendance,
} from '@/lib/attendance';
import { getProfile, type Role } from '@/lib/profile';

export default function Index() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [teacherEvents, setTeacherEvents] = useState<
    TeacherEventAttendance[]
  >([]);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const loadSummary = useCallback(async () => {
    if (!user) {
      setRecords([]);
      setTeacherEvents([]);
      setRole(null);
      setLoadingSummary(false);
      return;
    }

    setLoadingSummary(true);

    try {
      const profile = await getProfile(user.id);
      const currentRole = profile?.role ?? 'student';

      setRole(currentRole);

      if (currentRole === 'teacher') {
        const events = await getTeacherEventAttendance(user.id);
        setTeacherEvents(events);
        setRecords([]);
      } else {
        const history = await getAttendanceHistory(user.id);
        setRecords(history);
        setTeacherEvents([]);
      }
    } catch (error) {
      console.error('Failed to load attendance summary:', error);
    } finally {
      setLoadingSummary(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadSummary();
    }, [loadSummary])
  );

  const isTeacher = role === 'teacher';

  const totalEvents = isTeacher
    ? teacherEvents.length
    : records.length;

  const totalScans = isTeacher
    ? teacherEvents.reduce(
        (total, event) => total + event.attendeeCount,
        0
      )
    : records.length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F7F8FC"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>
              QR Attendance
            </Text>
            <Text style={styles.headerSubtitle}>
              School Event Attendance
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons
              name="school-outline"
              size={27}
              color="#e552c5"
            />
          </View>
        </View>

        {/* Attendance Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>
            {isTeacher ? 'Teacher Dashboard' : 'Attendance Summary'}
          </Text>

          <Text style={styles.summarySubtitle}>
            {isTeacher
              ? 'Monitor your events and student attendance.'
              : 'Keep track of your school event attendance.'}
          </Text>

          <View style={styles.summaryRow}>
            {/* First summary item */}
            <View style={styles.summaryItem}>
              <View style={styles.summaryIconPurple}>
                <Ionicons
                  name={isTeacher ? 'calendar-outline' : 'calendar-clear-outline'}
                  size={23}
                  color="#7C3AED"
                />
              </View>

              {loadingSummary ? (
                <ActivityIndicator size="small" color="#7C3AED" />
              ) : (
                <Text style={styles.summaryNumber}>
                  {totalEvents}
                </Text>
              )}

              <Text style={styles.summaryLabel}>
                {isTeacher ? 'My Events Created' : 'Events Attended'}
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            {/* Second summary item */}
            <View style={styles.summaryItem}>
              <View style={styles.summaryIconGreen}>
                <Ionicons
                  name="people-outline"
                  size={23}
                  color="#16804A"
                />
              </View>

              {loadingSummary ? (
                <ActivityIndicator size="small" color="#16804A" />
              ) : (
                <Text style={styles.summaryNumber}>
                  {totalScans}
                </Text>
              )}

              <Text style={styles.summaryLabel}>
                {isTeacher ? 'Student Attendance' : 'Recorded Scans'}
              </Text>
            </View>
          </View>

          <Text style={styles.summaryNote}>
            {loadingSummary
              ? 'Loading your attendance data...'
              : isTeacher
                ? 'Based on your created events and recorded scans.'
                : 'Based on your recorded attendance.'}
          </Text>
        </View>

        {/* Get Started */}
        <Text style={styles.sectionTitle}>
          Get Started
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.scanButton,
            pressed && styles.pressed,
          ]}
          onPress={() => router.push('/scan')}
        >
          <Ionicons
            name="qr-code-outline"
            size={23}
            color="#FFFFFF"
          />

          <Text style={styles.scanButtonText}>
            Scan QR Code
          </Text>

          <Ionicons
            name="arrow-forward"
            size={20}
            color="#FFFFFF"
          />
        </Pressable>

        {/* Quick Access */}
        <Text style={styles.sectionTitle}>
          Quick Access
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.accessButton,
            pressed && styles.pressed,
          ]}
          onPress={() => router.push('/history')}
        >
          <View style={styles.accessIcon}>
            <Ionicons
              name="time-outline"
              size={23}
              color="#526DE5"
            />
          </View>

          <View style={styles.accessTextContainer}>
            <Text style={styles.accessTitle}>
              Attendance History
            </Text>
            <Text style={styles.accessSubtitle}>
              {isTeacher
                ? 'View your events and student attendance'
                : 'View your recorded attendance'}
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color="#929BB0"
          />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.accessButton,
            pressed && styles.pressed,
          ]}
          onPress={() => router.push('/profile')}
        >
          <View style={styles.accessIcon}>
            <Ionicons
              name="person-outline"
              size={23}
              color="#526DE5"
            />
          </View>

          <View style={styles.accessTextContainer}>
            <Text style={styles.accessTitle}>
              My Profile
            </Text>
            <Text style={styles.accessSubtitle}>
              Manage your account information
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color="#929BB0"
          />
        </Pressable>

        {/* Footer */}
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
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },

  headerTitle: {
    fontSize: 23,
    fontWeight: '700',
    color: '#202A45',
  },

  headerSubtitle: {
    fontSize: 13,
    color: '#828B9F',
    marginTop: 5,
  },

  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#E8EDFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#E7EAF2',
  },

  summaryTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#4e304a',
  },

  summarySubtitle: {
    fontSize: 12,
    lineHeight: 19,
    color: '#828B9F',
    marginTop: 5,
  },

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },

  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 7,
  },

  summaryIconPurple: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryIconGreen: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#DDF7E8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryNumber: {
    fontSize: 25,
    fontWeight: '700',
    color: '#30394E',
  },

  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#828B9F',
    textAlign: 'center',
  },

  summaryDivider: {
    width: 1,
    height: 85,
    backgroundColor: '#EEF0F5',
    marginHorizontal: 8,
  },

  summaryNote: {
    fontSize: 10,
    color: '#929BB0',
    textAlign: 'center',
    marginTop: 17,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4e304a',
    marginBottom: 12,
  },

  scanButton: {
    minHeight: 58,
    backgroundColor: '#e552cc',
    borderRadius: 13,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 26,
  },

  scanButtonText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  accessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E7EAF2',
    minHeight: 78,
  },

  accessIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EEF1FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  accessTextContainer: {
    flex: 1,
  },

  accessTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#30394E',
  },

  accessSubtitle: {
    fontSize: 12,
    color: '#8991A2',
    marginTop: 5,
  },

  pressed: {
    opacity: 0.75,
  },

  footer: {
    textAlign: 'center',
    color: '#929BB0',
    fontSize: 11,
    marginTop: 20,
  },
});