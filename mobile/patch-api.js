import fs from 'fs';
let content = fs.readFileSync('src/api/edu-scan.ts', 'utf8');

content = content.replace(/export async function createAssignment\([\s\S]*?body: formData,\n    \}\);\n  \}\n\n  return requestJson<AssignmentApi>\('\/assignments', \{\n    method: 'POST',\n    token,\n    body: \{\n      title: payload\.title,\n      description: payload\.description,\n      deadline: payload\.deadline,\n      allowLate: payload\.allowLate,\n      latePenaltyPct: payload\.latePenaltyPct,\n      maxScore: payload\.maxScore,\n      classId: payload\.classId,\n    \},\n  \}\);\n\}/, `export async function createAssignment(
  token: string,
  payload: {
    title: string;
    description?: string;
    deadline: string;
    allowLate?: boolean;
    latePenaltyPct?: number;
    maxScore?: number;
    classId: string;
    instructionFiles?: Array<{
      uri: string;
      name: string;
      type?: string;
    }>;
  },
) {
  if (payload.instructionFiles && payload.instructionFiles.length > 0) {
    const formData = new FormData();
    formData.append('title', payload.title);
    if (payload.description) {
      formData.append('description', payload.description);
    }
    formData.append('deadline', payload.deadline);
    formData.append('allowLate', String(!!payload.allowLate));
    formData.append('latePenaltyPct', String(payload.latePenaltyPct ?? 0));
    formData.append('maxScore', String(payload.maxScore ?? 10));
    formData.append('classId', payload.classId);
    
    payload.instructionFiles.forEach(file => {
      formData.append('instructionFiles', {
        uri: file.uri,
        name: file.name,
        type: file.type || 'application/octet-stream',
      } as unknown as Blob);
    });

    return requestJson<AssignmentApi>('/assignments', {
      method: 'POST',
      token,
      body: formData,
    });
  }

  return requestJson<AssignmentApi>('/assignments', {
    method: 'POST',
    token,
    body: {
      title: payload.title,
      description: payload.description,
      deadline: payload.deadline,
      allowLate: payload.allowLate,
      latePenaltyPct: payload.latePenaltyPct,
      maxScore: payload.maxScore,
      classId: payload.classId,
    },
  });
}

export async function updateAssignment(
  token: string,
  assignmentId: string,
  payload: {
    title?: string;
    description?: string;
    deadline?: string;
    allowLate?: boolean;
    latePenaltyPct?: number;
    maxScore?: number;
    instructionFiles?: Array<{
      uri: string;
      name: string;
      type?: string;
    }>;
    attachments?: Array<{
      url: string;
      publicId: string;
      originalName: string;
      mimeType: string;
      sizeBytes: number;
      uploadedAt: string;
    }>;
  },
) {
  if (payload.instructionFiles && payload.instructionFiles.length > 0) {
    const formData = new FormData();
    if (payload.title) formData.append('title', payload.title);
    if (payload.description) formData.append('description', payload.description);
    if (payload.deadline) formData.append('deadline', payload.deadline);
    if (payload.allowLate !== undefined) formData.append('allowLate', String(payload.allowLate));
    if (payload.latePenaltyPct !== undefined) formData.append('latePenaltyPct', String(payload.latePenaltyPct));
    if (payload.maxScore !== undefined) formData.append('maxScore', String(payload.maxScore));
    
    if (payload.attachments) {
      formData.append('attachments', JSON.stringify(payload.attachments));
    }
    
    payload.instructionFiles.forEach(file => {
      formData.append('instructionFiles', {
        uri: file.uri,
        name: file.name,
        type: file.type || 'application/octet-stream',
      } as unknown as Blob);
    });

    return requestJson<AssignmentApi>(`/assignments/${assignmentId}`, {
      method: 'PATCH',
      token,
      body: formData,
    });
  }

  return requestJson<AssignmentApi>(`/assignments/${assignmentId}`, {
    method: 'PATCH',
    token,
    body: {
      title: payload.title,
      description: payload.description,
      deadline: payload.deadline,
      allowLate: payload.allowLate,
      latePenaltyPct: payload.latePenaltyPct,
      maxScore: payload.maxScore,
      attachments: payload.attachments,
    },
  });
}`);

content = content.replace(/export async function submitAssignment\([\s\S]*?body: formData,\n  \}\);\n\}/, `export async function submitAssignment(
  token: string,
  assignmentId: string,
  payload: {
    note?: string;
    files?: Array<{
      uri: string;
      name: string;
      type?: string;
    }>;
  },
) {
  if (payload.files && payload.files.length > 0) {
    const formData = new FormData();
    if (payload.note) {
      formData.append('note', payload.note);
    }
    payload.files.forEach(file => {
      formData.append('files', {
        uri: file.uri,
        name: file.name,
        type: file.type || 'application/octet-stream',
      } as unknown as Blob);
    });

    return requestJson<AssignmentSubmitApi>(`/assignments/${assignmentId}/submits`, {
      method: 'POST',
      token,
      body: formData,
    });
  }
  
  return requestJson<AssignmentSubmitApi>(`/assignments/${assignmentId}/submits`, {
    method: 'POST',
    token,
    body: {
      note: payload.note,
    },
  });
}

export async function updateStudentSubmit(
  token: string,
  assignmentId: string,
  payload: {
    note?: string;
    files?: Array<{
      uri: string;
      name: string;
      type?: string;
    }>;
    attachments?: Array<{
      url: string;
      publicId: string;
      originalName: string;
      mimeType: string;
      sizeBytes: number;
      uploadedAt: string;
    }>;
  },
) {
  if (payload.files && payload.files.length > 0) {
    const formData = new FormData();
    if (payload.note) {
      formData.append('note', payload.note);
    }
    if (payload.attachments) {
      formData.append('attachments', JSON.stringify(payload.attachments));
    }
    payload.files.forEach(file => {
      formData.append('files', {
        uri: file.uri,
        name: file.name,
        type: file.type || 'application/octet-stream',
      } as unknown as Blob);
    });

    return requestJson<AssignmentSubmitApi>(`/assignments/${assignmentId}/submits`, {
      method: 'PATCH',
      token,
      body: formData,
    });
  }
  
  return requestJson<AssignmentSubmitApi>(`/assignments/${assignmentId}/submits`, {
    method: 'PATCH',
    token,
    body: {
      note: payload.note,
      attachments: payload.attachments,
    },
  });
}`);

fs.writeFileSync('src/api/edu-scan.ts', content);
