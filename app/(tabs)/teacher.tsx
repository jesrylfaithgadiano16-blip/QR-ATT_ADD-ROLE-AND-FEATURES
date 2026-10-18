import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { useAuth } from '@/lib/auth';
import { createEvent } from '@/lib/events';
import {
  getTeacherEventAttendance,
  type TeacherEventAttendance,
} from '@/lib/attendance';
import { getProfile, type Role } from '@/lib/profile';

const BLUE = '#e552b4';
const LIGHT_BLUE = '#FCEAF5';
const BG = '#F7F8FC';
const TEXT = '#30394E';
const MUTED = '#828B9F';
const BORDER = '#E7EAF2';
const GREEN = '#25865D';

function toLocalISO(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

function formatDateTime(date: Date) {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric', 
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

const QUICK_END_OPTIONS = [
  { label: '+30 min', ms: 30 * 60 * 1000 },
  { label: '+1 hour', ms: 60 * 60 * 1000 },
  { label: '+2 hours', ms: 2 * 60 * 60 * 1000 },
];

type EditTarget = 'start' | 'end';

export default function TeacherScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [eventId, setEventId] = useState('');
  const [startDate, setStartDate] = useState(() => new Date());
  const [endDate, setEndDate] = useState(
    () => new Date(Date.now() + 60 * 60 * 1000)
  );
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editingPart, setEditingPart] = useState<'date' | 'time'>('date');
  const [payload, setPayload] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [messageError, setMessageError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [teacherEvents, setTeacherEvents] = useState<TeacherEventAttendance[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const isAndroid = Platform.OS === 'android';
  const canManageEvents = role === 'teacher' || role === 'admin';

  const refreshEvents = useCallback(async () => {
    if (!user || !canManageEvents) return;

    setEventsLoading(true);
    try {
      const events = await getTeacherEventAttendance(user.id);
      setTeacherEvents(events);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load your events. Please try again.'
      );
      setMessageError(true);
    } finally {
      setEventsLoading(false);
    }
  }, [user, canManageEvents]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadScreen() {
        if (!user) {
          setRole(null);
          setRoleLoading(false);
          return;
        }

        setRoleLoading(true);

        try {
          const profile = await getProfile(user.id);
          if (!active) return;

          const currentRole = profile?.role ?? 'student';
          setRole(currentRole);

          if (currentRole === 'teacher' || currentRole === 'admin') {
            setEventsLoading(true);
            try {
              const events = await getTeacherEventAttendance(user.id);
              if (active) setTeacherEvents(events);
            } catch {
              if (active) {
                setMessage('Unable to load your events.');
                setMessageError(true);
              }
            } finally {
              if (active) setEventsLoading(false);
            }
          } else {
            setTeacherEvents([]);
          }
        } catch {
          if (active) {
            setMessage('Unable to load your account information.');
            setMessageError(true);
          }
        } finally {
          if (active) setRoleLoading(false);
        }
      }

      loadScreen();
      return () => {
        active = false;
      };
    }, [user])
  );

  const openPicker = (target: EditTarget) => {
    setMessage('');
    setEditTarget(target);
    setEditingPart('date');
  };

  const onPickerChange = (
    event: DateTimePickerEvent,
    selected?: Date
  ) => {
    if (!editTarget) return;

    if (event.type === 'dismissed' || !selected) {
      setEditTarget(null);
      setEditingPart('date');
      return;
    }

    const current = editTarget === 'start' ? startDate : endDate;
    const next = new Date(current);

    if (isAndroid && editingPart === 'date') {
      next.setFullYear(
        selected.getFullYear(),
        selected.getMonth(),
        selected.getDate()
      );
    } else {
      next.setFullYear(
        selected.getFullYear(),
        selected.getMonth(),
        selected.getDate()
      );
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    }

    if (editTarget === 'start') {
      setStartDate(next);
    } else {
      setEndDate(next);
    }

    if (isAndroid && editingPart === 'date') {
      setEditingPart('time');
    } else {
      setEditTarget(null);
      setEditingPart('date');
    }
  };

  const handleQuickEnd = (ms: number) => {
    setMessage('');
    setEndDate(new Date(startDate.getTime() + ms));
  };

  const handleCreateEvent = async () => {
    if (saving) return;

    if (!user) {
      setMessage('Please log in again to create an event.');
      setMessageError(true);
      return;
    }

    if (!canManageEvents) {
      setMessage('Only teacher and admin accounts can create events.');
      setMessageError(true);
      return;
    }

    const cleanTitle = title.trim();
    const cleanEventId = eventId.trim();

    if (!cleanTitle || !cleanEventId) {
      setMessage('Please enter the event title and event code.');
      setMessageError(true);
      return;
    }

    if (endDate.getTime() <= startDate.getTime()) {
      setMessage('End time must be after start time.');
      setMessageError(true);
      return;
    }

    if (startDate.getTime() < Date.now() - 60000) {
      setMessage('Please choose a current or future start time.');
      setMessageError(true);
      return;
    }

    const event = {
      eventId: cleanEventId,
      title: cleanTitle,
      start: toLocalISO(startDate),
      end: toLocalISO(endDate),
    };

    setSaving(true);
    setMessage('');

    try {
      const result = await createEvent(event);

      if (result?.error) {
        throw new Error(result.error);
      }

      setPayload(
        JSON.stringify({
          v: 1,
          event: event.eventId,
          title: event.title,
          start: event.start,
          end: event.end,
        })
      );

      setMessage('Event created successfully!');
      setMessageError(false);
      setTitle('');
      setEventId('');
      await refreshEvents();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not create the event. Please try again.'
      );
      setMessageError(true);
    } finally {
      setSaving(false);
    }
  };

  if (roleLoading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color={BLUE} />
        <Text style={styles.stateText}>Loading account...</Text>
      </View>
    );
  }

  if (!canManageEvents) {
    return (
      <View style={styles.centerState}>
        <View style={styles.emptyIcon}>
          <Ionicons name="lock-closed-outline" size={32} color={BLUE} />
        </View>
        <Text style={styles.pageTitle}>Access Restricted</Text>
        <Text style={styles.stateText}>
          Only teacher and admin accounts can create events.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageTitle}>
            {role === 'admin' ? 'Admin Event Management' : 'Teacher'}
          </Text>
          <Text style={styles.pageSubtitle}>
            Create and manage school events.
          </Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="calendar-outline" size={25} color={BLUE} />
        </View>
      </View>

      <View style={styles.formCard}>
        <View style={styles.sectionHeading}>
          <View style={styles.sectionIcon}>
            <Ionicons name="add-circle-outline" size={22} color={BLUE} />
          </View>
          <View style={styles.headingText}>
            <Text style={styles.sectionTitle}>Create New Event</Text>
            <Text style={styles.sectionSubtitle}>
              Enter the event details below.
            </Text>
          </View>
        </View>

        <Text style={styles.label}>Event Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Founders Day Assembly"
          placeholderTextColor="#A0A7B6"
          maxLength={100}
        />

        <Text style={styles.label}>Event Code</Text>
        <TextInput
          style={styles.input}
          value={eventId}
          onChangeText={setEventId}
          placeholder="e.g. EVT-2026-0002"
          placeholderTextColor="#A0A7B6"
          autoCapitalize="characters"
          maxLength={50}
        />

        <Text style={styles.label}>Start Date & Time</Text>
        <PickerField
          value={formatDateTime(startDate)}
          icon="time-outline"
          onPress={() => openPicker('start')}
        />

        <Text style={styles.label}>End Date & Time</Text>
        <PickerField
          value={formatDateTime(endDate)}
          icon="moon-outline"
          onPress={() => openPicker('end')}
        />

        <Text style={styles.quickLabel}>Quick Duration</Text>
        <View style={styles.chipRow}>
          {QUICK_END_OPTIONS.map((option) => (
            <Pressable
              key={option.label}
              style={({ pressed }) => [
                styles.chip,
                pressed && styles.chipPressed,
              ]}
              onPress={() => handleQuickEnd(option.ms)}
            >
              <Text style={styles.chipText}>{option.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.hint}>
          Choose a duration to set the end time automatically.
        </Text>

        {message ? (
          <View style={[styles.messageBox, messageError && styles.errorBox]}>
            <Ionicons
              name={messageError ? 'alert-circle-outline' : 'checkmark-circle-outline'}
              size={19}
              color={messageError ? '#C24141' : GREEN}
            />
            <Text style={[styles.messageText, messageError && styles.errorText]}>
              {message}
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={handleCreateEvent}
          disabled={saving}
          style={({ pressed }) => [
            styles.createButton,
            pressed && !saving && styles.buttonPressed,
            saving && styles.disabledButton,
          ]}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Ionicons name="add-circle-outline" size={22} color="#FFFFFF" />
          )}
          <Text style={styles.createButtonText}>
            {saving ? 'Creating Event...' : 'Create Event'}
          </Text>
        </Pressable>
      </View>

      {editTarget ? (
        <View style={styles.pickerContainer}>
          <DateTimePicker
            value={editTarget === 'start' ? startDate : endDate}
            mode={isAndroid ? editingPart : 'datetime'}
            display={isAndroid ? 'default' : 'spinner'}
            onChange={onPickerChange}
          />
        </View>
      ) : null}

      {payload ? (
        <View style={styles.qrCard}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionIcon}>
              <Ionicons name="qr-code-outline" size={22} color={BLUE} />
            </View>
            <View style={styles.headingText}>
              <Text style={styles.sectionTitle}>Event QR Code</Text>
              <Text style={styles.sectionSubtitle}>
                Ready to scan using the Scan tab.
              </Text>
            </View>
          </View>

          <View style={styles.qrBox}>
            <QRCode value={payload} size={190} />
          </View>
          <Text style={styles.qrHint}>
            Let students scan this QR code to record attendance.
          </Text>
          <Pressable
            style={styles.hideQrButton}
            onPress={() => setPayload(null)}
          >
            <Ionicons name="chevron-up-outline" size={18} color={BLUE} />
            <Text style={styles.hideQrText}>Hide QR Code</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.eventsSection}>
        <View style={styles.eventsHeadingRow}>
          <View>
            <Text style={styles.sectionTitle}>My Created Events</Text>
            <Text style={styles.sectionSubtitle}>
              Events created by your account.
            </Text>
          </View>
          <Pressable
            style={styles.refreshButton}
            onPress={refreshEvents}
            disabled={eventsLoading}
          >
            {eventsLoading ? (
              <ActivityIndicator size="small" color={BLUE} />
            ) : (
              <Ionicons name="refresh-outline" size={21} color={BLUE} />
            )}
          </Pressable>
        </View>

        {eventsLoading && teacherEvents.length === 0 ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={BLUE} />
            <Text style={styles.stateText}>Loading events...</Text>
          </View>
        ) : teacherEvents.length === 0 ? (
          <View style={styles.emptyEventsCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="calendar-clear-outline" size={30} color={BLUE} />
            </View>
            <Text style={styles.emptyTitle}>No Events Yet</Text>
            <Text style={styles.emptyDescription}>
              Your created events will appear here after you create one.
            </Text>
          </View>
        ) : (
          teacherEvents.map((event) => (
            <View key={event.eventId} style={styles.eventCard}>
              <View style={styles.eventTopRow}>
                <View style={styles.eventIcon}>
                  <Ionicons name="calendar-outline" size={23} color={BLUE} />
                </View>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventCode}>{event.eventCode}</Text>
                </View>
              </View>

              {event.startTime ? (
                <View style={styles.eventMetaRow}>
                  <Ionicons name="time-outline" size={17} color={MUTED} />
                  <Text style={styles.eventMeta}>
                    {formatDate(event.startTime)}
                  </Text>
                </View>
              ) : null}

              <View style={styles.eventBottomRow}>
                <View style={styles.attendanceBadge}>
                  <Ionicons name="people-outline" size={16} color={GREEN} />
                  <Text style={styles.attendanceText}>
                    {event.attendeeCount}{' '}
                    {event.attendeeCount === 1 ? 'attendee' : 'attendees'}
                  </Text>
                </View>
                <Text style={styles.createdLabel}>Created event</Text>
              </View>
            </View>
          ))
        )}
      </View>

      <Text style={styles.footer}>QR-ATT · School Attendance System</Text>
    </ScrollView>
  );
}

type PickerFieldProps = {
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

function PickerField({ value, icon, onPress }: PickerFieldProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.pickerField,
        pressed && styles.pickerFieldPressed,
      ]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={20} color={BLUE} />
      <Text style={styles.pickerValue}>{value}</Text>
      <Ionicons name="calendar-outline" size={19} color={MUTED} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 30 },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  pageTitle: { fontSize: 25, fontWeight: '700', color: '#202A45' },
  pageSubtitle: { fontSize: 13, color: MUTED, marginTop: 5 },
  headerIcon: {
    width: 47,
    height: 47,
    borderRadius: 15,
    backgroundColor: LIGHT_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 17,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 20,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: LIGHT_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  headingText: { flex: 1 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: TEXT },
  sectionSubtitle: { fontSize: 12, color: MUTED, marginTop: 4, lineHeight: 18 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT,
    marginBottom: 7,
    marginTop: 13,
  },
  input: {
    minHeight: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 14,
    color: TEXT,
  },
  pickerField: {
    minHeight: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerFieldPressed: { backgroundColor: LIGHT_BLUE },
  pickerValue: { flex: 1, fontSize: 13, color: TEXT, marginHorizontal: 10 },
  quickLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT,
    marginTop: 18,
    marginBottom: 9,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: LIGHT_BLUE,
    borderWidth: 1,
    borderColor: '#F3CDE3',
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  chipPressed: { backgroundColor: '#F8D8EA' },
  chipText: { fontSize: 12, fontWeight: '600', color: BLUE },
  hint: { fontSize: 11, lineHeight: 17, color: MUTED, marginTop: 8 },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 11,
    backgroundColor: '#EAF7EF',
    borderRadius: 10,
    marginTop: 14,
  },
  errorBox: { backgroundColor: '#FFF0F0' },
  messageText: { flex: 1, fontSize: 12, color: GREEN, lineHeight: 18 },
  errorText: { color: '#C24141' },
  createButton: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: BLUE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 18,
  },
  createButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  buttonPressed: { opacity: 0.85 },
  disabledButton: { opacity: 0.65 },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 18,
    alignItems: 'center',
    padding: 10,
  },
  qrCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 18,
    marginBottom: 24,
  },
  qrBox: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginTop: 8,
  },
  qrHint: {
    textAlign: 'center',
    color: MUTED,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 13,
  },
  hideQrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    padding: 10,
    marginTop: 5,
  },
  hideQrText: { fontSize: 13, fontWeight: '600', color: BLUE },
  eventsSection: { marginTop: 2 },
  eventsHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 15,
    marginBottom: 12,
  },
  eventTopRow: { flexDirection: 'row', alignItems: 'center' },
  eventIcon: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: LIGHT_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 5 },
  eventCode: { fontSize: 12, color: MUTED },
  eventMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 13 },
  eventMeta: { flex: 1, fontSize: 12, color: MUTED },
  eventBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F7',
    paddingTop: 12,
    marginTop: 13,
  },
  attendanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EAF7EF',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9,
  },
  attendanceText: { fontSize: 11, fontWeight: '600', color: GREEN },
  createdLabel: { fontSize: 11, color: MUTED },
  emptyEventsCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 22,
    paddingVertical: 27,
  },
  emptyIcon: {
    width: 65,
    height: 65,
    borderRadius: 20,
    backgroundColor: LIGHT_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 7 },
  emptyDescription: { fontSize: 12, color: MUTED, textAlign: 'center', lineHeight: 19 },
  loadingCard: {
    alignItems: 'center',
    padding: 25,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BORDER,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BG,
    padding: 25,
  },
  stateText: { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 20, marginTop: 10 },
  footer: { textAlign: 'center', fontSize: 11, color: '#929BB0', paddingTop: 20, paddingBottom: 8 },
});

