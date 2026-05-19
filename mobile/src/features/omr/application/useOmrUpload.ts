import { useState } from 'react';

import { listOmrExams, uploadOmrBatch } from '../../../api/edu-scan';
import { documentTypes, pickMultipleDocuments } from '../../shared/infrastructure/document-picker/document-picker-adapter';
import type { NativeFile } from '../../shared/domain/native-file';
import { useToast } from '../../../app/ToastProvider';

export function useOmrUpload({
  accessToken,
  onUploaded,
}: {
  accessToken: string | null;
  onUploaded: () => Promise<void>;
}) {
  const { showToast } = useToast();
  const [selectedFiles, setSelectedFiles] = useState<NativeFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const pickFiles = async () => {
    const files = await pickMultipleDocuments(documentTypes.images);
    if (files.length) {
      setSelectedFiles(files);
      setSubmitError(null);
    }
  };

  const submit = async (examLookup: string) => {
    if (!accessToken) {
      return false;
    }

    if (!selectedFiles.length) {
      setSubmitError('Vui lòng chọn ít nhất một ảnh phiếu OMR');
      return false;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const exams = await listOmrExams(accessToken);
      const normalizedExam = examLookup.trim().toLowerCase();
      const exam = exams.find(
        (item) =>
          item.title.toLowerCase() === normalizedExam ||
          item.id.toLowerCase() === normalizedExam,
      );

      if (!exam) {
        setSubmitError('Cần chọn đề thi hợp lệ');
        return false;
      }

      await uploadOmrBatch(accessToken, {
        examId: exam.id,
        files: selectedFiles.map((file) => ({
          uri: file.uri,
          name: file.name,
          type: file.type,
        })),
      });
      setSelectedFiles([]);
      await onUploaded();
      showToast('Đã tạo batch OMR!');
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
    submit,
  };
}
