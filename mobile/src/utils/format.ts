export function formatVietnameseDate(value: string) {
  return new Date(value).toLocaleDateString('vi-VN');
}

export function isExpired(deadline: string) {
  return new Date(deadline) < new Date();
}

export function percentage(part: number, total: number) {
  if (!total) {
    return 0;
  }

  return Math.round((part / total) * 100);
}
