import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
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

export default function HistoryScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [studentRecords, setStudentRecords] = useState<AttendanceRecord[]>([]);
  const [teacherEvents, setTeacherEvents] = useState<TeacherEventAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEventCode, setExpandedEventCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const profile = await getProfile(user.id);
      const currentRole = profile?.role ?? 'student';

      setRole(currentRole);

      if (currentRole === 'teacher') {
        const events = await getTeacherEventAttendance(user.id);
        setTeacherEvents(events);
        setStudentRecords([]);
      } else {
        const records = await getAttendanceHistory(user.id);
        setStudentRecords(records);
        setTeacherEvents([]);
      }
    } catch (error) {
      console.error('Failed to load attendance history:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const isTeacher = role === 'teacher';

  const filteredTeacherEvents = teacherEvents.filter((event) => {
    const query = searchQuery.trim().toLowerCase();

    return (
      event.title.toLowerCase().includes(query) ||
      event.eventCode.toLowerCase().includes(query)
    );
  });

  const filteredStudentRecords = studentRecords.filter((record) => {
    const query = searchQuery.trim().toLowerCase();

    return (
      record.eventTitle.toLowerCase().includes(query) ||
      record.eventId.toLowerCase().includes(query)
    );
  });

  const displayedRecords = isTeacher
    ? filteredTeacherEvents
    : filteredStudentRecords;

  const hasRecords = displayedRecords.length > 0;

  const renderStudentRecord = ({
    item,
  }: {
    item: AttendanceRecord;
  }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.eventIcon}>
          <Ionicons
            name="calendar-outline"
            size={23}
            color="#e552b9"
          />
        </View>

        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{item.eventTitle}</Text>
          <Text style={styles.eventCode}>{item.eventId}</Text>
        </View>

        <View style={styles.checkIcon}>
          <Ionicons name="checkmark" size={17} color="#21845B" />
        </View>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.dateRow}>
        <Ionicons name="time-outline" size={17} color="#9b7d91" />
        <Text style={styles.dateText}>
          {formatDate(item.scannedAt)}
        </Text>
      </View>

      <View style={styles.statusRow}>
        <View style={styles.statusDot} />
        <Text style={styles.statusText}>Attendance Recorded</Text>
      </View>
    </View>
  );

  const renderTeacherEvent = ({
    item,
  }: {
    item: TeacherEventAttendance;
  }) => {
    const eventKey = String(item.eventCode);
    const isExpanded = expandedEventCode === eventKey;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.card}
        onPress={() => {
          setExpandedEventCode(isExpanded ? null : eventKey);
        }}
      >
        <View style={styles.cardTop}>
          <View style={styles.eventIcon}>
            <Ionicons
              name="calendar-outline"
              size={23}
              color="#e552d1"
            />
          </View>

          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle}>{item.title}</Text>
            <Text style={styles.eventCode}>{item.eventCode}</Text>
          </View>

          <View style={styles.countBadge}>
            <Ionicons
              name="people-outline"
              size={14}
              color="#c84395"
            />
            <Text style={styles.countText}>
              {item.attendeeCount}
            </Text>
          </View>
        </View>

        {item.startTime ? (
          <View style={styles.dateRow}>
            <Ionicons
              name="time-outline"
              size={17}
              color="#9b7d92"
            />
            <Text style={styles.dateText}>
              {formatDate(item.startTime)}
            </Text>
          </View>
        ) : null}

        <View style={styles.cardDivider} />

        <View style={styles.expandRow}>
          <Text style={styles.attendeeHeading}>
            Student Attendance
          </Text>

          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#c84395"
          />
        </View>

        {!isExpanded ? (
          <Text style={styles.tapHint}>
            Tap to view attendance
          </Text>
        ) : item.attendees.length === 0 ? (
          <View style={styles.noAttendeesRow}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color="#8992A5"
            />
            <Text style={styles.emptyAttendeeText}>
              No students have scanned yet.
            </Text>
          </View>
        ) : (
          item.attendees.map((attendee) => (
            <View
              key={`${attendee.studentId}-${attendee.scannedAt}`}
              style={styles.attendeeRow}
            >
              <View style={styles.studentIcon}>
                <Ionicons
                  name="person-outline"
                  size={17}
                  color="#e552d1"
                />
              </View>

              <View style={styles.attendeeInfo}>
                <Text style={styles.studentId}>
                  {shortId(attendee.studentId)}
                </Text>
                <Text style={styles.scanTime}>
                  {formatDate(attendee.scannedAt)}
                </Text>
              </View>

              <Ionicons
                name="checkmark-circle"
                size={19}
                color="#29966A"
              />
            </View>
          ))
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>History</Text>
        <Text style={styles.pageSubtitle}>
          {isTeacher
            ? 'Manage your events and student attendance.'
            : 'Keep track of your school event attendance.'}
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons
          name="search-outline"
          size={20}
          color="#9b7d92"
        />

        <TextInput
          style={styles.searchInput}
          placeholder={
            isTeacher
              ? 'Search event title or code...'
              : 'Search attendance history...'
          }
          placeholderTextColor="#9b91a0"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />

        {searchQuery.length > 0 ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons
              name="close-circle"
              size={20}
              color="#9b91a0"
            />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {isTeacher ? 'My Events' : 'Attendance History'}
        </Text>

        {!loading && (
          <View style={styles.totalBadge}>
            <Text style={styles.totalText}>
              {displayedRecords.length}
            </Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#e552c0" />
          <Text style={styles.stateText}>Loading history...</Text>
        </View>
      ) : !hasRecords ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name={
                searchQuery.trim().length > 0
                  ? 'search-outline'
                  : isTeacher
                    ? 'calendar-outline'
                    : 'time-outline'
              }
              size={35}
              color="#e552de"
            />
          </View>

          <Text style={styles.emptyTitle}>
            {searchQuery.trim().length > 0
              ? 'No Matching Results'
              : isTeacher
                ? 'No Events Yet'
                : 'No Attendance Yet'}
          </Text>

          <Text style={styles.emptyDescription}>
            {searchQuery.trim().length > 0
              ? 'Try another event title or code.'
              : isTeacher
                ? 'Create an event from the Teacher tab to see it here.'
                : 'Scan an event QR code to record your attendance. Your records will appear here.'}
          </Text>

          {searchQuery.trim().length > 0 ? (
            <Text
              style={styles.clearSearch}
              onPress={() => setSearchQuery('')}
            >
              Clear Search
            </Text>
          ) : null}
        </View>
      ) : isTeacher ? (
        <FlatList<TeacherEventAttendance>
          key="teacher-history"
          data={filteredTeacherEvents}
          keyExtractor={(item, index) =>
            `${item.eventCode}-${index}`
          }
          renderItem={renderTeacherEvent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
        />
      ) : (
        <FlatList<AttendanceRecord>
          key="student-history"
          data={filteredStudentRecords}
          keyExtractor={(item, index) =>
            `${item.eventId}-${item.scannedAt}-${index}`
          }
          renderItem={renderStudentRecord}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
        />
      )}

      <Text style={styles.footer}>
        QR-ATT · School Attendance System
      </Text>
    </SafeAreaView>
  );
}

function shortId(id: string) {
  return id ? `${id.slice(0, 4)}…${id.slice(-8)}` : 'Unknown';
}

function formatDate(iso: string) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return date.toLocaleString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FC',
    paddingHorizontal: 20,
  },

  pageHeader: {
    paddingTop: 18,
    marginBottom: 18,
  },

  pageTitle: {
    fontSize: 25,
    fontWeight: '700',
    color: '#202A45',
  },

  pageSubtitle: {
    fontSize: 13,
    color: '#9f8299',
    lineHeight: 20,
    marginTop: 6,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7EAF2',
    borderRadius: 13,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 20,
  },

  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#30394E',
    marginLeft: 10,
    paddingVertical: 0,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#4e3047',
  },

  totalBadge: {
    minWidth: 30,
    height: 30,
    paddingHorizontal: 9,
    borderRadius: 15,
    backgroundColor: '#E7EBFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  totalText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#c843b2',
  },

  list: {
    paddingBottom: 15,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E7EAF2',
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  eventIcon: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: '#EEF1FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  eventInfo: {
    flex: 1,
  },

  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#30394E',
    marginBottom: 5,
  },

  eventCode: {
    fontSize: 12,
    color: '#8991A2',
  },

  checkIcon: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: '#E4F6EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  cardDivider: {
    height: 1,
    backgroundColor: '#EEF0F5',
    marginVertical: 14,
  },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 12,
  },

  dateText: {
    flex: 1,
    fontSize: 12,
    color: '#927385',
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 13,
    gap: 7,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#29966A',
  },

  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#25865D',
  },

  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E7EBFF',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 8,
  },

  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#c8438c',
  },

  expandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  attendeeHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#30394E',
    marginBottom: 10,
  },

  tapHint: {
    fontSize: 12,
    color: '#8991A2',
    marginTop: 2,
  },

  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F7',
    gap: 10,
  },

  studentIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EEF1FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  attendeeInfo: {
    flex: 1,
  },

  studentId: {
    fontSize: 13,
    fontWeight: '600',
    color: '#30394E',
  },

  scanTime: {
    fontSize: 11,
    color: '#8991A2',
    marginTop: 4,
  },

  noAttendeesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  emptyAttendeeText: {
    fontSize: 12,
    color: '#8991A2',
  },

  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },

  stateText: {
    color: '#9f8294',
    fontSize: 13,
    marginTop: 12,
  },

  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 25,
    paddingVertical: 32,
    borderWidth: 1,
    borderColor: '#E7EAF2',
    marginTop: 5,
  },

  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: '#EEF1FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#30394E',
    marginBottom: 8,
  },

  emptyDescription: {
    fontSize: 13,
    color: '#828B9F',
    textAlign: 'center',
    lineHeight: 21,
  },

  clearSearch: {
    fontSize: 13,
    fontWeight: '700',
    color: '#c843b2',
    marginTop: 18,
  },

  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: '#929BB0',
    paddingTop: 10,
    paddingBottom: 12,
  },
});
