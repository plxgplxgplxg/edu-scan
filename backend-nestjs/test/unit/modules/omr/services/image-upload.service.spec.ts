import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ImageUploadService } from '../../../../../src/modules/omr/services/image-upload.service';
import { IStorageService } from '../../../../../src/storage/storage.interface';

describe('ImageUploadService', () => {
  const storageService = {
    uploadFile: jest.fn(),
    uploadDocument: jest.fn(),
    deleteFile: jest.fn(),
  };

  let service: ImageUploadService;
  let tempDir: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    tempDir = await mkdtemp(join(tmpdir(), 'eduscan-omr-artifact-'));
    service = new ImageUploadService(
      storageService as unknown as IStorageService,
    );
  });

  afterEach(async () => {
    await rm(tempDir, { force: true, recursive: true });
  });

  it('returns remote artifact urls without re-uploading', async () => {
    await expect(
      service.uploadArtifact('https://example.com/artifact.png', 'batch-1'),
    ).resolves.toBe('https://example.com/artifact.png');

    expect(storageService.uploadFile).not.toHaveBeenCalled();
  });

  it('uploads a local artifact file', async () => {
    const artifactPath = join(tempDir, 'answer_scores.json');
    await writeFile(artifactPath, '{"ok":true}', 'utf8');
    storageService.uploadFile.mockResolvedValueOnce(
      'https://storage.example.com/answer_scores.json',
    );

    await expect(service.uploadArtifact(artifactPath, 'batch-1')).resolves.toBe(
      'https://storage.example.com/answer_scores.json',
    );

    expect(storageService.uploadFile).toHaveBeenCalledWith(
      expect.objectContaining({
        originalname: 'answer_scores.json',
        mimetype: 'application/json',
        size: Buffer.byteLength('{"ok":true}'),
        path: artifactPath,
      }),
      'eduscan/omr/batch-1/artifacts',
    );
  });

  it('skips missing optional artifact files', async () => {
    await expect(
      service.uploadArtifact(join(tempDir, 'missing.json'), 'batch-1'),
    ).resolves.toBeNull();

    expect(storageService.uploadFile).not.toHaveBeenCalled();
  });
});
