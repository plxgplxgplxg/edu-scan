export const ASSIGNMENT_INSTRUCTION_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ASSIGNMENT_SUBMISSION_MAX_FILE_BYTES = 20 * 1024 * 1024;

export const ASSIGNMENT_ATTACHMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

export const ASSIGNMENT_ATTACHMENT_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.zip',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
]);

export const ASSIGNMENT_INSTRUCTION_MIME_TYPES =
  ASSIGNMENT_ATTACHMENT_MIME_TYPES;
export const ASSIGNMENT_INSTRUCTION_EXTENSIONS =
  ASSIGNMENT_ATTACHMENT_EXTENSIONS;
export const ASSIGNMENT_SUBMISSION_MIME_TYPES = ASSIGNMENT_ATTACHMENT_MIME_TYPES;
export const ASSIGNMENT_SUBMISSION_EXTENSIONS =
  ASSIGNMENT_ATTACHMENT_EXTENSIONS;
