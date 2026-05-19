import { copyToClipboard } from '../../shared/infrastructure/clipboard/clipboard-adapter';
import { useToast } from '../../../app/ToastProvider';

export function useCopyClassCode() {
  const { showToast } = useToast();

  const copyClassCode = async (code: string) => {
    await copyToClipboard(code);
    showToast('Đã sao chép mã lớp!');
  };

  return {
    copyClassCode,
  };
}
