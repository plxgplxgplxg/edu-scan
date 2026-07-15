/* eslint-disable react/no-unstable-nested-components, no-void, react-native/no-inline-styles */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View, Switch } from 'react-native';
import {
  BookOpen,
  CheckCircle,
  Clock,
  Copy,
  ClipboardList,
  FileText,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  addStudentToClass,
  createClassReportExportJob,
  createAssignment,
  deleteAssignment,
  deleteClass,
  downloadClassReportExportFile,
  getAssignmentSubmits,
  getClassDetail,
  gradeAssignmentSubmit,
  listAssignments,
  mapClassDetail,
  mapTeacherAssignmentSummary,
  removeStudentFromClass,
  type AssignmentSubmitApi,
} from '../../api/edu-scan';
import type { AssignmentSummary } from '../../types/domain';
import { AppText } from '../../components/AppText';
import { ModalSheet } from '../../components/ModalSheet';
import { PageHeader } from '../../components/PageHeader';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ProgressBar } from '../../components/ProgressBar';
import { ErrorState, LoadingState } from '../../components/RequestState';
import { Screen } from '../../components/Screen';
import { SurfaceCard } from '../../components/SurfaceCard';
import { TextInputField } from '../../components/TextInputField';
import { FilterChips } from '../../components/FilterChips';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { useAppContent } from '../../hooks/useAppContent';
import { useToast } from '../../app/ToastProvider';
import { useCopyClassCode } from '../../features/classes/application/useCopyClassCode';
import {
  subscribeReportExportJob,
  type ReportExportSseEvent,
} from '../../features/reports/application/report-export-sse';
import { useAuth } from '../../store/auth-store';
import { appTheme, palette } from '../../theme/tokens';
import { useResponsiveLayout } from '../../theme/responsive';
import { primaryHeroGradient } from '../../theme/header';
import { formatVietnameseDate, percentage } from '../../utils/format';
import type { RootStackParamList } from '../../navigation/types';
import type { NativeFile } from '../../features/shared/domain/native-file';
import { pickSingleDocument } from '../../features/shared/infrastructure/document-picker/document-picker-adapter';
import {
  ASSIGNMENT_INSTRUCTION_EXTENSIONS,
  ASSIGNMENT_INSTRUCTION_MAX_FILE_BYTES,
  ASSIGNMENT_INSTRUCTION_MIME_TYPES,
} from '../../features/assignments/domain/assignment-file-policy';
import {
  formatFileSize,
  getFileExtension,
} from '../../features/assignments/domain/assignment-file-utils';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type DetailTab = 'students' | 'assignments' | 'info';

export function TeacherClassDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'TeacherClassDetail'>>();
  const content = useAppContent();
  const { accessToken } = useAuth();
  const layout = useResponsiveLayout();
  const { showToast } = useToast();
  const { copyClassCode } = useCopyClassCode();
  const classId = route.params?.classId;
  const [activeTab, setActiveTab] = useState<DetailTab>('students');
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [studentLookup, setStudentLookup] = useState('');
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentSummary | null>(null);
  const [assignmentSubmits, setAssignmentSubmits] = useState<AssignmentSubmitApi[]>([]);
  const [gradeForms, setGradeForms] = useState<Record<string, { score: string; feedback: string }>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const reportJobUnsubscribeRef = useRef<(() => void) | null>(null);
  const [reportJob, setReportJob] = useState<{
    jobId: string;
    status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    format: 'xlsx' | 'pdf';
    fileName: string | null;
    errorMessage: string | null;
    receivedFileName?: string;
    receivedFileSizeKb?: number;
  } | null>(null);
  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    description: '',
    deadline: '',
    allowLate: false,
    maxScore: '10',
    latePenaltyPct: '10',
  });
  const [assignmentInstructionFile, setAssignmentInstructionFile] = useState<NativeFile | null>(null);
  const { data, loading, error, reload } = useAsyncResource(
    async () => {
      if (!accessToken || !classId) {
        return null;
      }

      const [classItem, assignments] = await Promise.all([
        getClassDetail(accessToken, classId),
        listAssignments(accessToken),
      ]);

      const detail = mapClassDetail(classItem);
      const classMap = new Map([[classItem.id, classItem]]);

      return {
        currentClass: detail,
        assignments: assignments
          .filter((item) => item.classId === classItem.id)
          .map((item) => mapTeacherAssignmentSummary(item, classMap)),
      };
    },
    [accessToken, classId],
  );

  const currentClass = data?.currentClass;
  const currentClassId = currentClass?.id ?? null;
  const classStudents = currentClass?.students ?? [];
  const teacherAssignments = data?.assignments ?? [];

  const openAssignmentSubmits = async (assignment: AssignmentSummary) => {
    if (!accessToken) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const submits = await getAssignmentSubmits(accessToken, assignment.id);
      setAssignmentSubmits(submits);
      setGradeForms(
        Object.fromEntries(
          submits.map((submit) => [
            submit.id,
            {
              score: submit.score === null ? '' : String(submit.score),
              feedback: submit.feedback ?? '',
            },
          ]),
        ),
      );
      setSelectedAssignment(assignment);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    return () => {
      reportJobUnsubscribeRef.current?.();
      reportJobUnsubscribeRef.current = null;
    };
  }, []);

  const startReportExport = async (format: 'xlsx' | 'pdf') => {
    if (!accessToken || !currentClassId) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const job = await createClassReportExportJob(accessToken, currentClassId, format);
      setReportJob({
        jobId: job.jobId,
        status: job.status,
        format: job.format,
        fileName: job.fileName,
        errorMessage: job.errorMessage,
      });

      reportJobUnsubscribeRef.current?.();
      const unsubscribe = subscribeReportExportJob({
        token: accessToken,
        jobId: job.jobId,
        onEvent: async (event: ReportExportSseEvent) => {
          const nextStatus =
            event.type === 'report:completed'
              ? 'COMPLETED'
              : event.type === 'report:failed'
                ? 'FAILED'
                : event.type === 'report:processing'
                  ? 'PROCESSING'
                  : 'QUEUED';

          setReportJob((current) =>
            current && current.jobId === event.jobId
              ? {
                  ...current,
                  status: nextStatus,
                  fileName: event.fileName ?? current.fileName,
                  errorMessage: event.errorMessage ?? null,
                }
              : current,
          );

          if (event.type === 'report:completed') {
            try {
              const file = await downloadClassReportExportFile(accessToken, event.jobId);
              const sizeKb = Math.max(1, Math.round(file.buffer.byteLength / 1024));
              setReportJob((current) =>
                current && current.jobId === event.jobId
                  ? {
                      ...current,
                      receivedFileName: file.fileName ?? event.fileName ?? undefined,
                      receivedFileSizeKb: sizeKb,
                    }
                  : current,
              );
              showToast(
                `Đã nhận ${file.fileName ?? event.fileName ?? 'report'} (${String(sizeKb)} KB)`,
              );
            } catch (err) {
              setSubmitError(
                err instanceof Error ? err.message : 'Có lỗi tải file báo cáo',
              );
            } finally {
              unsubscribe();
              reportJobUnsubscribeRef.current = null;
            }
          }

          if (event.type === 'report:failed') {
            setSubmitError(event.errorMessage || 'Xuất báo cáo thất bại');
            unsubscribe();
            reportJobUnsubscribeRef.current = null;
          }
        },
        onError: (err) => {
          setSubmitError(err.message);
        },
      });
      reportJobUnsubscribeRef.current = unsubscribe;
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteClass = () => {
    if (!currentClass) {
      return;
    }

    Alert.alert(
      'Xoá lớp học',
      `Bạn có chắc muốn xoá lớp "${currentClass.name}"? Bài tập, bài nộp, ghi danh và liên kết đề kiểm tra trắc nghiệm của lớp này sẽ bị xoá.`,
      [
        { text: content.common.buttons.cancel, style: 'cancel' },
        {
          text: 'Xoá lớp',
          style: 'destructive',
          onPress: () => {
            if (!accessToken) {
              return;
            }

            setSubmitting(true);
            setSubmitError(null);
            deleteClass(accessToken, currentClass.id)
              .then(() => {
                navigation.navigate('TeacherTabs', { screen: 'TeacherClasses' });
              })
              .catch((err: unknown) => {
                setSubmitError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
              })
              .finally(() => {
                setSubmitting(false);
              });
          },
        },
      ],
    );
  };

  const confirmDeleteAssignment = (assignment: AssignmentSummary) => {
    Alert.alert(
      'Xoá bài tập',
      `Bạn có chắc muốn xoá bài tập "${assignment.title}"? Mọi bài nộp và điểm số sẽ bị xoá vĩnh viễn.`,
      [
        { text: content.common.buttons.cancel, style: 'cancel' },
        {
          text: 'Xoá',
          style: 'destructive',
          onPress: () => {
            if (!accessToken) return;
            setSubmitting(true);
            setSubmitError(null);
            deleteAssignment(accessToken, assignment.id)
              .then(() => reload())
              .catch((err) => {
                setSubmitError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
              })
              .finally(() => setSubmitting(false));
          },
        },
      ]
    );
  };

  const pickInstructionFile = async () => {
    const file = await pickSingleDocument(ASSIGNMENT_INSTRUCTION_MIME_TYPES);
    if (!file) {
      return;
    }

    if (!ASSIGNMENT_INSTRUCTION_EXTENSIONS.has(getFileExtension(file.name))) {
      setSubmitError('Định dạng file hướng dẫn không được hỗ trợ');
      return;
    }

    if (file.size !== null && file.size > ASSIGNMENT_INSTRUCTION_MAX_FILE_BYTES) {
      setSubmitError('File hướng dẫn vượt quá giới hạn 10MB');
      return;
    }

    setAssignmentInstructionFile(file);
    setSubmitError(null);
  };

  const tabItems = useMemo(
    () => [
      { id: 'students' as const, label: `${content.common.tabs.students} (${String(classStudents.length)})` },
      { id: 'assignments' as const, label: `${content.common.tabs.assignments} (${String(teacherAssignments.length)})` },
      { id: 'info' as const, label: content.common.sections.info },
    ],
    [
      classStudents.length,
      content.common.sections.info,
      content.common.tabs.assignments,
      content.common.tabs.students,
      teacherAssignments.length,
    ],
  );

  if (!currentClass && loading) {
    return (
      <Screen refreshing={loading} onRefresh={() => { void reload(); }}>
        <LoadingState label={content.common.labels.loading} />
      </Screen>
    );
  }

  if (!currentClass && error) {
    return (
      <Screen refreshing={loading} onRefresh={() => { void reload(); }}>
        <ErrorState
          message={error}
          retryLabel={content.common.buttons.retry}
          onRetry={reload}
        />
      </Screen>
    );
  }

  if (!currentClass) {
    return (
      <Screen>
        <ErrorState
          message="Không tìm thấy lớp học"
          retryLabel={content.common.buttons.back}
          onRetry={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  return (
    <Screen refreshing={loading} onRefresh={() => { void reload(); }}>
      <PageHeader
        backLabel={content.common.buttons.back}
        title={currentClass.name}
        subtitle={`${currentClass.subject} • ${currentClass.schoolYear}`}
        gradient={primaryHeroGradient}
        onBack={() => navigation.goBack()}
        leadingVisual={<BookOpen size={30} color={palette.white} />}
        footer={(
          <View style={styles.codeRow}>
            <Pressable
              style={styles.codePill}
              onPress={() => {
                void copyClassCode(currentClass.code);
              }}
            >
              <Copy size={14} color={palette.white} />
              <AppText variant="label" weight="semibold" color={palette.white}>
                {currentClass.code}
              </AppText>
            </Pressable>
            <View style={styles.studentPill}>
              <Users size={14} color={palette.white} />
              <AppText variant="label" weight="semibold" color={palette.white}>
                {`${String(classStudents.length)} ${content.teacher.classes.studentCountSuffix}`}
              </AppText>
            </View>
          </View>
        )}
      />

      <View
        style={[
          styles.body,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingTop: layout.sectionGap,
            maxWidth: layout.contentMaxWidth,
            alignSelf: 'center',
            width: '100%',
            gap: layout.sectionGap,
          },
        ]}
      >
        <FilterChips value={activeTab} items={tabItems} onChange={setActiveTab} />

        {activeTab === 'students' ? (
          <View style={styles.section}>
            <PrimaryButton
              variant="outline"
              label={content.teacher.classes.addStudent}
              icon={<UserPlus size={18} color={palette.primary} />}
              onPress={() => setShowAddStudent(true)}
            />
            {classStudents.map(student => (
              <SurfaceCard key={student.id} style={styles.rowCard}>
                <View style={styles.avatarCircle}>
                  <AppText variant="label" weight="bold" color={student.isActive ? palette.secondaryForeground : palette.destructive}>
                    {student.name.charAt(0)}
                  </AppText>
                </View>
                <View style={styles.flex}>
                  <AppText variant="body" weight="medium">
                    {student.name}
                  </AppText>
                  <AppText variant="caption" color={palette.mutedForeground}>
                    {`${student.studentCode} • ${student.joinedAt}`}
                  </AppText>
                </View>
                <Pressable
                  onPress={async () => {
                    if (!accessToken) {
                      return;
                    }

                    setSubmitting(true);
                    setSubmitError(null);

                    try {
                      await removeStudentFromClass(accessToken, currentClass.id, student.id);
                      await reload();
                    } catch (err) {
                      setSubmitError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                >
                  <Trash2 size={16} color={palette.mutedForeground} />
                </Pressable>
              </SurfaceCard>
            ))}
          </View>
        ) : null}

        {activeTab === 'assignments' ? (
          <View style={styles.section}>
            <PrimaryButton
              variant="outline"
              label={content.teacher.classes.newAssignment}
              icon={<ClipboardList size={18} color={palette.primary} />}
              onPress={() => setShowCreateAssignment(true)}
            />
            {teacherAssignments.map(item => {
              const submitCount = item.submitCount ?? 0;
              const totalStudents = item.totalStudents ?? 0;
              const progress = percentage(submitCount, totalStudents);

              return (
                <SurfaceCard key={item.id} style={styles.assignmentCard}>
                  <View style={[styles.assignmentHead, layout.isCompact ? styles.assignmentHeadStack : null]}>
                    <View style={styles.flex}>
                      <AppText variant="body" weight="medium">
                        {item.title}
                      </AppText>
                      {item.description ? (
                        <AppText variant="caption" color={palette.mutedForeground}>
                          {item.description}
                        </AppText>
                      ) : null}
                      {item.instructionFileUrl ? (
                        <Pressable
                          style={styles.fileRow}
                          onPress={() => {
                            void Linking.openURL(item.instructionFileUrl || '');
                          }}
                        >
                          <FileText size={15} color={palette.primary} />
                          <View style={styles.flex}>
                            <AppText variant="label" weight="semibold" color={palette.primary}>
                              {item.instructionFileOriginalName ?? 'File hướng dẫn'}
                            </AppText>
                            <AppText variant="caption" color={palette.mutedForeground}>
                              {`${item.instructionFileMimeType ?? 'Tài liệu'} • ${formatFileSize(item.instructionFileSizeBytes)}`}
                            </AppText>
                          </View>
                        </Pressable>
                      ) : null}
                    </View>
                    <View style={styles.scoreBadge}>
                      <AppText variant="caption" color={palette.secondaryForeground}>
                        {`${String(item.maxScore)} ${content.common.labels.scoreUnit}`}
                      </AppText>
                    </View>
                    <Pressable
                      onPress={() => confirmDeleteAssignment(item)}
                      style={{ marginLeft: 8 }}
                      hitSlop={8}
                    >
                      <Trash2 size={16} color={palette.destructive} />
                    </Pressable>
                  </View>
                  <View style={styles.assignmentMeta}>
                    <View style={styles.inlineMeta}>
                      <Clock size={12} color={palette.mutedForeground} />
                      <AppText variant="caption" color={palette.mutedForeground}>
                        {`${content.common.form.deadline}: ${formatVietnameseDate(item.deadline)}`}
                      </AppText>
                    </View>
                    <View style={styles.inlineMeta}>
                      <CheckCircle size={12} color={palette.success} />
                      <AppText variant="caption" color={palette.mutedForeground}>
                        {`${String(submitCount)}/${String(totalStudents)}`}
                      </AppText>
                    </View>
                  </View>
                  <View style={styles.progressRow}>
                    <View style={styles.flex}>
                      <ProgressBar progress={progress} color={progress === 100 ? palette.success : palette.primary} />
                    </View>
                    <AppText variant="caption" color={palette.mutedForeground}>
                      {`${String(progress)}%`}
                    </AppText>
                  </View>
                  <PrimaryButton
                    variant="outline"
                    label={content.teacher.classes.viewSubmissions}
                    loading={submitting}
                    onPress={() => {
                      void openAssignmentSubmits(item);
                    }}
                  />
                </SurfaceCard>
              );
            })}
          </View>
        ) : null}

        {activeTab === 'info' ? (
          <View style={styles.section}>
            {[
              { label: content.common.form.className, value: currentClass.name },
              { label: content.common.form.subject, value: currentClass.subject },
              { label: content.common.form.schoolYear, value: currentClass.schoolYear },
              { label: content.student.classes.classInfoTitle, value: currentClass.code },
            ].map(item => (
              <SurfaceCard
                key={item.label}
                style={[styles.infoCard, layout.isCompact ? styles.infoCardStack : null]}
              >
                <AppText variant="caption" color={palette.mutedForeground}>
                  {item.label}
                </AppText>
                <AppText variant="body" weight="medium">
                  {item.value}
                </AppText>
              </SurfaceCard>
            ))}
            <PrimaryButton
              label="Xuất báo cáo XLSX"
              loading={submitting}
              onPress={async () => {
                await startReportExport('xlsx');
              }}
            />
            <PrimaryButton
              variant="outline"
              label="Xuất báo cáo PDF"
              loading={submitting}
              onPress={async () => {
                await startReportExport('pdf');
              }}
            />
            <PrimaryButton
              variant="danger"
              label="Xoá lớp học"
              loading={submitting}
              icon={<Trash2 size={18} color={palette.destructive} />}
              onPress={confirmDeleteClass}
            />
            {reportJob ? (
              <SurfaceCard style={styles.reportCard}>
                <AppText variant="caption" color={palette.mutedForeground}>
                  Export job
                </AppText>
                <AppText variant="body" weight="medium">
                  {`${reportJob.format.toUpperCase()} • ${reportJob.jobId}`}
                </AppText>
                <AppText variant="caption" color={palette.mutedForeground}>
                  {`Trạng thái: ${reportJob.status}`}
                </AppText>
                {reportJob.receivedFileName ? (
                  <AppText variant="caption" color={palette.success}>
                    {`Đã nhận file ${reportJob.receivedFileName} (${String(reportJob.receivedFileSizeKb ?? 0)} KB)`}
                  </AppText>
                ) : null}
                {reportJob.errorMessage ? (
                  <AppText variant="caption" color={palette.destructive}>
                    {reportJob.errorMessage}
                  </AppText>
                ) : null}
              </SurfaceCard>
            ) : null}
            {submitError ? (
              <AppText variant="caption" color={palette.destructive}>
                {submitError}
              </AppText>
            ) : null}
          </View>
        ) : null}
      </View>

      <ModalSheet visible={showAddStudent} onClose={() => setShowAddStudent(false)}>
        <AppText variant="headline" weight="bold" style={styles.sheetTitle}>
          {content.teacher.classes.addStudent}
        </AppText>
        <TextInputField
          label={content.teacher.classes.studentsByCode}
          value={studentLookup}
          onChangeText={setStudentLookup}
          placeholder={content.common.placeholders.studentLookup}
        />
        <PrimaryButton
          label={content.teacher.classes.addStudent}
          loading={submitting}
          onPress={async () => {
            if (!accessToken) {
              return;
            }

            setSubmitting(true);
            setSubmitError(null);

            try {
              const value = studentLookup.trim();
              await addStudentToClass(accessToken, currentClass.id, {
                email: value.includes('@') ? value : undefined,
                studentCode: value.includes('@') ? undefined : value,
              });
              setStudentLookup('');
              setShowAddStudent(false);
              await reload();
            } catch (err) {
              setSubmitError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
            } finally {
              setSubmitting(false);
            }
          }}
          style={styles.sheetButton}
        />
        {submitError ? (
          <AppText variant="caption" color={palette.destructive}>
            {submitError}
          </AppText>
        ) : null}
      </ModalSheet>

      <ModalSheet
        visible={showCreateAssignment}
        onClose={() => {
          setShowCreateAssignment(false);
          setAssignmentInstructionFile(null);
        }}
      >
        <AppText variant="headline" weight="bold" style={styles.sheetTitle}>
          {content.teacher.classes.newAssignment}
        </AppText>
        <View style={styles.sheetForm}>
          <TextInputField
            label={content.common.form.assignmentTitle}
            value={assignmentForm.title}
            onChangeText={value =>
              setAssignmentForm(current => ({ ...current, title: value }))
            }
            placeholder={content.common.placeholders.assignmentTitle}
          />
          <TextInputField
            label={content.common.form.assignmentDescription}
            value={assignmentForm.description}
            onChangeText={value =>
              setAssignmentForm(current => ({ ...current, description: value }))
            }
            placeholder={content.common.placeholders.assignmentDescription}
          />
          <View style={styles.filePickerBlock}>
            <AppText variant="label" weight="semibold">
              File hướng dẫn
            </AppText>
            {assignmentInstructionFile ? (
              <SurfaceCard style={styles.selectedFileCard}>
                <View style={styles.flex}>
                  <AppText variant="body" weight="medium">
                    {assignmentInstructionFile.name}
                  </AppText>
                  <AppText variant="caption" color={palette.mutedForeground}>
                    {`${assignmentInstructionFile.type || 'application/octet-stream'} • ${formatFileSize(assignmentInstructionFile.size)}`}
                  </AppText>
                </View>
                <Pressable onPress={() => setAssignmentInstructionFile(null)}>
                  <X size={18} color={palette.destructive} />
                </Pressable>
              </SurfaceCard>
            ) : null}
            <PrimaryButton
              label="Chọn file"
              variant="outline"
              onPress={() => {
                void pickInstructionFile();
              }}
            />
            <AppText variant="caption" color={palette.mutedForeground}>
              PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, TXT hoặc ZIP • tối đa 10MB
            </AppText>
          </View>
          <TextInputField
            label={content.common.form.deadline}
            value={assignmentForm.deadline}
            onChangeText={value =>
              setAssignmentForm(current => ({ ...current, deadline: value }))
            }
            placeholder={content.common.placeholders.dateTime + " (VD: 2026-07-20T10:00:00)"}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText variant="label" weight="semibold">Cho phép nộp muộn</AppText>
            <Switch
              value={assignmentForm.allowLate}
              onValueChange={value => setAssignmentForm(current => ({ ...current, allowLate: value }))}
              trackColor={{ true: palette.primary, false: palette.muted }}
            />
          </View>
          {assignmentForm.allowLate && (
            <TextInputField
              label="% Trừ điểm nộp muộn"
              value={assignmentForm.latePenaltyPct}
              onChangeText={value =>
                setAssignmentForm(current => ({ ...current, latePenaltyPct: value }))
              }
              keyboardType="numeric"
              placeholder="Ví dụ: 10"
            />
          )}
          <TextInputField
            label={content.common.form.maxScore}
            value={assignmentForm.maxScore}
            onChangeText={value =>
              setAssignmentForm(current => ({ ...current, maxScore: value }))
            }
            placeholder={content.common.placeholders.maxScore}
          />
          <PrimaryButton
            label={content.common.buttons.createAssignment}
            loading={submitting}
            onPress={async () => {
              if (!accessToken) {
                return;
              }

              setSubmitting(true);
              setSubmitError(null);

              try {
                await createAssignment(accessToken, {
                  title: assignmentForm.title.trim(),
                  description: assignmentForm.description.trim() || undefined,
                  deadline: new Date(assignmentForm.deadline).toISOString(),
                  maxScore: Number(assignmentForm.maxScore),
                  allowLate: assignmentForm.allowLate,
                  latePenaltyPct: assignmentForm.allowLate ? Number(assignmentForm.latePenaltyPct) : 0,
                  classId: currentClass.id,
                  instructionFile: assignmentInstructionFile
                    ? {
                        uri: assignmentInstructionFile.uri,
                        name: assignmentInstructionFile.name,
                        type: assignmentInstructionFile.type,
                      }
                    : undefined,
                });
                setShowCreateAssignment(false);
                setAssignmentForm({
                  title: '',
                  description: '',
                  deadline: '',
                  allowLate: false,
                  maxScore: '10',
                  latePenaltyPct: '10',
                });
                setAssignmentInstructionFile(null);
                await reload();
              } catch (err) {
                setSubmitError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
              } finally {
                setSubmitting(false);
              }
            }}
          />
          {submitError ? (
            <AppText variant="caption" color={palette.destructive}>
              {submitError}
            </AppText>
          ) : null}
        </View>
      </ModalSheet>

      <ModalSheet
        visible={!!selectedAssignment}
        onClose={() => setSelectedAssignment(null)}
      >
        <AppText variant="headline" weight="bold" style={styles.sheetTitle}>
          {selectedAssignment?.title ?? ''}
        </AppText>
        <View style={styles.sheetForm}>
          {classStudents.map((student) => {
            const submit = assignmentSubmits.find((item) => item.studentId === student.id);
            const form = submit ? gradeForms[submit.id] ?? { score: '', feedback: '' } : null;
            const submitLabel = submit
              ? submit.submitStatus === 'LATE'
                ? 'Trễ'
                : 'Đúng hạn'
              : 'Chưa nộp';

            return (
              <SurfaceCard key={student.id} style={styles.submitCard}>
                <View style={styles.assignmentHead}>
                  <View style={styles.flex}>
                    <AppText variant="body" weight="medium">
                      {student.name}
                    </AppText>
                    <AppText variant="caption" color={palette.mutedForeground}>
                      {`${student.studentCode || student.email} • ${submitLabel}${submit?.submittedAt ? ` • ${formatVietnameseDate(submit.submittedAt)}` : ''}`}
                    </AppText>
                  </View>
                  {submit?.fileUrl ? (
                    <Pressable
	                      onPress={() => {
	                        void Linking.openURL(submit.fileUrl || '');
	                      }}
                    >
                      <AppText variant="label" weight="semibold" color={palette.primary}>
                        Mở file
                      </AppText>
                    </Pressable>
                  ) : null}
                </View>
                {submit && form ? (
                  <View style={styles.gradeForm}>
                    {submit.note ? (
                      <View style={styles.submissionInfoBlock}>
                        <AppText variant="caption" color={palette.mutedForeground}>
                          Ghi chú
                        </AppText>
                        <AppText variant="body">
                          {submit.note}
                        </AppText>
                      </View>
                    ) : null}
                    {submit.fileUrl ? (
                      <Pressable
                        style={styles.fileRow}
                        onPress={() => {
                          void Linking.openURL(submit.fileUrl || '');
                        }}
                      >
                        <FileText size={16} color={palette.primary} />
                        <View style={styles.flex}>
                          <AppText variant="label" weight="semibold" color={palette.primary}>
                            {submit.fileOriginalName ?? 'File bài làm'}
                          </AppText>
                          <AppText variant="caption" color={palette.mutedForeground}>
                            {`${submit.fileMimeType ?? 'Tài liệu'} • ${formatFileSize(submit.fileSizeBytes)}`}
                          </AppText>
                        </View>
                      </Pressable>
                    ) : null}
                    <TextInputField
                      label="Điểm"
                      value={form.score}
                      keyboardType="numeric"
                      onChangeText={(value) =>
                        setGradeForms((current) => ({
                          ...current,
                          [submit.id]: { ...form, score: value },
                        }))
                      }
                      placeholder={`0-${String(selectedAssignment?.maxScore ?? 10)}`}
                    />
                    <TextInputField
                      label="Nhận xét"
                      value={form.feedback}
                      onChangeText={(value) =>
                        setGradeForms((current) => ({
                          ...current,
                          [submit.id]: { ...form, feedback: value },
                        }))
                      }
                      placeholder="Nhận xét nhanh"
                    />
                    <PrimaryButton
                      label="Lưu điểm"
                      loading={submitting}
                      onPress={async () => {
                        if (!accessToken || !selectedAssignment) {
                          return;
                        }

                        setSubmitting(true);
                        setSubmitError(null);

                        try {
                          await gradeAssignmentSubmit(accessToken, selectedAssignment.id, submit.id, {
                            score: Number(form.score),
                            feedback: form.feedback.trim() || undefined,
                          });
                          await openAssignmentSubmits(selectedAssignment);
                        } catch (err) {
                          setSubmitError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
                        } finally {
                          setSubmitting(false);
                        }
                      }}
                    />
                  </View>
                ) : null}
              </SurfaceCard>
            );
          })}
          {submitError ? (
            <AppText variant="caption" color={palette.destructive}>
              {submitError}
            </AppText>
          ) : null}
        </View>
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: appTheme.spacing.lg,
  },
  codeRow: {
    flexDirection: 'row',
    gap: appTheme.spacing.sm,
    flexWrap: 'wrap',
  },
  codePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: appTheme.spacing.lg,
    paddingVertical: 10,
    borderRadius: appTheme.radius.lg,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  studentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: appTheme.spacing.lg,
    paddingVertical: 10,
    borderRadius: appTheme.radius.lg,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  section: {
    gap: appTheme.spacing.md,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.spacing.md,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.secondary,
  },
  flex: {
    flex: 1,
  },
  assignmentCard: {
    gap: appTheme.spacing.md,
    borderLeftWidth: 5,
    borderLeftColor: 'rgba(97,91,227,0.92)',
  },
  assignmentHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: appTheme.spacing.md,
  },
  assignmentHeadStack: {
    flexWrap: 'wrap',
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: appTheme.radius.sm,
    backgroundColor: palette.secondary,
  },
  assignmentMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: appTheme.spacing.md,
  },
  inlineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.spacing.sm,
    paddingVertical: appTheme.spacing.xs,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.spacing.md,
  },
  infoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: appTheme.spacing.md,
  },
  infoCardStack: {
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  reportCard: {
    gap: 4,
  },
  sheetTitle: {
    marginBottom: appTheme.spacing.lg,
  },
  sheetButton: {
    marginTop: appTheme.spacing.lg,
  },
  sheetForm: {
    gap: appTheme.spacing.lg,
  },
  filePickerBlock: {
    gap: appTheme.spacing.sm,
  },
  selectedFileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.spacing.md,
  },
  submitCard: {
    gap: appTheme.spacing.md,
  },
  gradeForm: {
    gap: appTheme.spacing.sm,
  },
  submissionInfoBlock: {
    gap: 4,
  },
});
