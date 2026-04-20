import { useAuth } from '../store/auth-store';

export function useAppContent() {
  return useAuth().content;
}
