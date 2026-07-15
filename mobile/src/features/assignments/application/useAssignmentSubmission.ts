import { useState } from 'react';

import { submitAssignment } from '../../../api/edu-scan';
import { pickSingleDocument } from '../../shared/infrastructure/document-picker/document-picker-adapter';
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
  const [selectedFile, setSelectedFile] = useState<NativeFile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const pickFile = async () => {
    const file = await pickSingleDocument(ASSIGNMENT_SUBMISSION_MIME_TYPES);
    if (file) {
      if (!ASSIGNMENT_SUBMISSION_EXTENSIONS.has(getFileExtension(file.name))) {
        setSubmitError('Định dạng tệp không được hỗ trợ');
        return;
      }
      if (file.size !== null && file.size > ASSIGNMENT_SUBMISSION_MAX_FILE_BYTES) {
        setSubmitError('Tệp vượt quá giới hạn 20MB');
        return;
      }
      setSelectedFile(file);
      setSubmitError(null);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
  };

  const submitAssignmentContent = async (assignmentId: string, note: string) => {
    if (!accessToken) {
      return false;
    }

    const trimmedNote = note.trim();
    if (!trimmedNote && !selectedFile) {
      setSubmitError('Vui lòng nhập ghi chú hoặc chọn tệp để nộp bài');
      return false;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await submitAssignment(accessToken, assignmentId, {
        note: trimmedNote || undefined,
        file: selectedFile
          ? {
              uri: selectedFile.uri,
              name: selectedFile.name,
              type: selectedFile.type,
            }
          : undefined,
      });
      setSelectedFile(null);
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

  return {
    selectedFile,
    submitting,
    submitError,
    pickFile,
    clearSelectedFile,
    submitAssignmentContent,
  };
}
