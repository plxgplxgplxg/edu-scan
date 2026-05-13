import Clipboard from '@react-native-clipboard/clipboard';

export async function copyToClipboard(value: string) {
  Clipboard.setString(value);
}
