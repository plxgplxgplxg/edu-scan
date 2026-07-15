import { useState } from 'react';

import { submitAssignment, updateStudentSubmit } from '../../../api/edu-scan';
import { pickMultipleDocuments, documentTypes } from '../../shared/infrastructure/document-picker/document-picker-adapter';
import type { NativeFile } from '../../shared/domain/native-file';
import { useToast } from '../../../app/ToastProvider';
import {
  ASSIGNMENT_SUBMISSION_EXTENSIONS,
  ASSIGNMENT_SUBMISSION_MAX_FILE_BYTES,
  ASSIGNMENT_SUBMISSION_MIME_TYPES,
} from '../domain/assignment-file-policy';
import { getFileExtension } from '../domain/assignment-file-utils';

export function useAssignmentSubmission({
  accessToken,
  onSubmitted,
}: {
  accessToken: string | null;
  onSubmitted: () => Promise<void>;
}) {
  const { showToast } = useToast();
  const [selectedFiles, setSelectedFiles] = useState<NativeFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const pickFiles = async () => {
    const files = await pickMultipleDocuments([
      ...ASSIGNMENT_SUBMISSION_MIME_TYPES,
      documentTypes.images,
    ]);
    if (files && files.length > 0) {
      for (const file of files) {
        if (!ASSIGNMENT_SUBMISSION_EXTENSIONS.has(getFileExtension(file.name))) {
          setSubmitError(`Định dạng tệp ${file.name} không được hỗ trợ`);
          return;
        }
        if (file.size !== null && file.size > ASSIGNMENT_SUBMISSION_MAX_FILE_BYTES) {
          setSubmitError(`Tệp ${file.name} vượt quá giới hạn 20MB`);
          return;
        }
      }
      setSelectedFiles(prev => [...prev, ...files]);
      setSubmitError(null);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearSelectedFiles = () => {
    setSelectedFiles([]);
  };

  const submitAssignmentContent = async (assignmentId: string, note: string) => {
    if (!accessToken) {
      return false;
    }

    const trimmedNote = note.trim();
    if (!trimmedNote && selectedFiles.length === 0) {
      setSubmitError('Vui lòng nhập ghi chú hoặc chọn tệp để nộp bài');
      return false;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await submitAssignment(accessToken, assignmentId, {
        note: trimmedNote || undefined,
        files: selectedFiles.length > 0
          ? selectedFiles.map(f => ({
              uri: f.uri,
              name: f.name,
              type: f.type,
            }))
          : undefined,
      });
      setSelectedFiles([]);
      await onSubmitted();
      showToast('Đã nộp bài!');
      return true;
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Có lỗi xảy ra');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const updateSubmissionContent = async (
    assignmentId: string,
    note: string,
    retainedAttachments: Array<{
      url: string;
      publicId: string;
      originalName: string;
      mimeType: string;
      sizeBytes: number;
      uploadedAt: string;
    }>
  ) => {
    if (!accessToken) {
      return false;
    }

    const trimmedNote = note.trim();
    if (!trimmedNote && selectedFiles.length === 0 && retainedAttachments.length === 0) {
      setSubmitError('Vui lòng nhập ghi chú hoặc có ít nhất một tệp đính kèm');
      return false;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await updateStudentSubmit(accessToken, assignmentId, {
        note: trimmedNote || undefined,
        attachments: retainedAttachments,
        files: selectedFiles.length > 0
          ? selectedFiles.map(f => ({
              uri: f.uri,
              name: f.name,
              type: f.type,
            }))
          : undefined,
      });
      setSelectedFiles([]);
      await onSubmitted();
      showToast('Đã cập nhật bài nộp!');
      return true;
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Có lỗi xảy ra');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    selectedFiles,
    submitting,
    submitError,
    pickFiles,
    removeFile,
    clearSelectedFiles,
    submitAssignmentContent,
    updateSubmissionContent,
  };
}
