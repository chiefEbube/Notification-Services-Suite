import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { SendgridService } from '../sendgrid/sendgrid.service';
import { firstValueFrom, of } from 'rxjs'; 
import { AxiosResponse } from 'axios';

const mockHttpService = {
  get: jest.fn(),
};

const mockSendgridService = {
  sendEmail: jest.fn(),
};

const mockConfigService = {
  getOrThrow: jest.fn((key: string) => {
    if (key === 'USER_SERVICE_URL') return 'http://fake-user-service.com';
    if (key === 'TEMPLATE_SERVICE_URL')
      return 'http://fake-template-service.com';
    return null;
  }),
};

const mockJobData = {
  user_id: 'user-123',
  template_code: 'welcome-v1',
  request_id: 'req-abc',
  variables: {
    name: 'Test User',
    link: 'http://example.com',
  },
};

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  preferences: { email: true },
};

const mockTemplate = {
  html: '<h1>Hello {{name}}</h1>',
};

describe('EmailService', () => {
  let service: EmailService;
  let httpService: HttpService;
  let sendgridService: SendgridService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SendgridService, useValue: mockSendgridService },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    httpService = module.get<HttpService>(HttpService);
    sendgridService = module.get<SendgridService>(SendgridService);
  });

  it('should send an email if user preferences are true', async () => {
    mockHttpService.get.mockImplementation((url: string) => {
      if (url.includes('users')) {
        return of({ data: { data: mockUser } } as AxiosResponse);
      }
      if (url.includes('templates')) {
        return of({ data: { html: mockTemplate.html } } as AxiosResponse);
      }
      return of(null);
    });
    mockSendgridService.sendEmail.mockResolvedValue(null);

    await service.processEmailJob(mockJobData);

    expect(mockHttpService.get).toHaveBeenCalledWith(
      'http://fake-user-service.com/api/v1users/user-123',
    );
    expect(mockHttpService.get).toHaveBeenCalledWith(
      'http://fake-template-service.com/api/v1templates/welcome-v1',
    );
    expect(mockSendgridService.sendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendgridService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@example.com',
        html: '<h1>Hello Test User</h1>',
      }),
    );
  });

  it('should NOT send an email if user preferences are false', async () => {
    const optedOutUser = { ...mockUser, preferences: { email: false } };
    mockHttpService.get.mockReturnValue(
      of({ data: { data: optedOutUser } } as AxiosResponse),
    );

    await service.processEmailJob(mockJobData);

    expect(mockHttpService.get).toHaveBeenCalledTimes(1);
    expect(mockSendgridService.sendEmail).not.toHaveBeenCalled();
    expect(mockHttpService.get).toHaveBeenCalledTimes(1);
  });

  it('should throw an error if the user service fails', async () => {
    mockHttpService.get.mockImplementation(() => {
      throw new Error('User service is down');
    });

    await expect(service.processEmailJob(mockJobData)).rejects.toThrow(
      'User service is down',
    );
    expect(mockSendgridService.sendEmail).not.toHaveBeenCalled();
  });
});