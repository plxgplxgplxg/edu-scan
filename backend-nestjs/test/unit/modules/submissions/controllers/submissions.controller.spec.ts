import { Test, TestingModule } from '@nestjs/testing';
import { SubmissionsController } from '../../../../../src/modules/submissions/controllers/submissions.controller';
import { SubmissionsService } from '../../../../../src/modules/submissions/services/submissions.service';
import { Role } from '@prisma/client';

describe('SubmissionsController', () => {
  let controller: SubmissionsController;
  let service: SubmissionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubmissionsController],
      providers: [
        {
          provide: SubmissionsService,
          useValue: {
            findAll: jest.fn(),
            findOneWithScore: jest.fn(),
            manualOverride: jest.fn(),
            findMySubmissions: jest.fn(),
            getMyProgress: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SubmissionsController>(SubmissionsController);
    service = module.get<SubmissionsService>(SubmissionsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call findAll', async () => {
    const findAllSpy = jest
      .spyOn(service, 'findAll')
      .mockResolvedValue([] as any);
    await controller.findAll({});
    expect(findAllSpy).toHaveBeenCalledWith({});
  });

  it('should call findOneWithScore with request user', async () => {
    const mockUser = { id: 'user-1', role: Role.STUDENT };
    const findOneWithScoreSpy = jest
      .spyOn(service, 'findOneWithScore')
      .mockResolvedValue({ id: 'sub-1' } as any);
    await controller.findOne('sub-1', { user: mockUser });
    expect(findOneWithScoreSpy).toHaveBeenCalledWith('sub-1', mockUser);
  });

  it('should call manualOverride', async () => {
    const dto = { studentCode: '123' };
    const manualOverrideSpy = jest
      .spyOn(service, 'manualOverride')
      .mockResolvedValue({ id: 'sub-1' } as any);
    await controller.manualOverride('sub-1', dto);
    expect(manualOverrideSpy).toHaveBeenCalledWith('sub-1', dto);
  });

  it('should call findMySubmissions with student user id', async () => {
    const mockUser = { id: 'student-1', role: Role.STUDENT };
    const query = { page: 1, limit: 10 };
    const findMySubmissionsSpy = jest
      .spyOn(service, 'findMySubmissions')
      .mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      } as any);

    await controller.findMySubmissions({ user: mockUser }, query as any);

    expect(findMySubmissionsSpy).toHaveBeenCalledWith(mockUser, query as any);
  });

  it('should call getMyProgress with student user id', async () => {
    const mockUser = { id: 'student-1', role: Role.STUDENT };
    const getMyProgressSpy = jest
      .spyOn(service, 'getMyProgress')
      .mockResolvedValue([] as any);

    await controller.getMyProgress({ user: mockUser });

    expect(getMyProgressSpy).toHaveBeenCalledWith(mockUser);
  });
});
