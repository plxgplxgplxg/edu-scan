import { useState } from 'react';

import { submitAssignment } from '../../../api/edu-scan';
import { documentTypes, pickSingleDocument } from '../../shared/infrastructure/document-picker/document-picker-adapter';
import type { NativeFile } from '../../shared/domain/native-file';
import { useToast } from '../../../app/ToastProvider';

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
    const file = await pickSingleDocument([
      documentTypes.pdf,
      documentTypes.doc,
      documentTypes.docx,
      documentTypes.images,
      documentTypes.plainText,
    ]);
    if (file) {
      setSelectedFile(file);
      setSubmitError(null);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
  };

  const submitSelectedFile = async (assignmentId: string) => {
    if (!accessToken) {
      return false;
    }

    if (!selectedFile) {
      setSubmitError('Vui lòng chọn tệp để nộp bài');
      return false;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await submitAssignment(accessToken, assignmentId, {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.type,
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
    submitSelectedFile,
  };
}
