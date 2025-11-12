import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { SendgridService } from '../sendgrid/sendgrid.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { of, throwError } from 'rxjs';
import * as Handlebars from 'handlebars';

describe('EmailService', () => {
  let service: EmailService;
  let httpService: jest.Mocked<HttpService>;
  let configService: jest.Mocked<ConfigService>;
  let sendgridService: jest.Mocked<SendgridService>;
  let cache: jest.Mocked<Cache>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    preferences: {
      email: true,
    },
  };

  const mockTemplate = '<h1>Hello {{name}}</h1>';

  const mockJobData = {
    request_id: 'req-123',
    user_id: 'user-123',
    template_code: 'welcome-email',
    variables: {
      name: 'John Doe',
    },
  };

  beforeEach(async () => {
    const mockHttpService = {
      get: jest.fn(),
    };

    const mockConfigService = {
      getOrThrow: jest.fn((key: string) => {
        const config: Record<string, string> = {
          USER_SERVICE_URL: 'http://user-service',
          TEMPLATE_SERVICE_URL: 'http://template-service',
          SENDGRID_FROM_EMAIL: 'noreply@example.com',
        };
        return config[key];
      }),
    };

    const mockSendgridService = {
      sendEmail: jest.fn(),
    };

    const mockCache = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: SendgridService,
          useValue: mockSendgridService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCache,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    httpService = module.get(HttpService);
    configService = module.get(ConfigService);
    sendgridService = module.get(SendgridService);
    cache = module.get(CACHE_MANAGER);

    // Mock console methods to avoid cluttering test output
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processEmailJob', () => {
    it('should successfully process email job with cache hits', async () => {
      // Arrange
      cache.get.mockResolvedValueOnce(mockUser);
      cache.get.mockResolvedValueOnce(mockTemplate);

      // Act
      const result = await service.processEmailJob(mockJobData);

      // Assert
      expect(result).toBe(true);
      expect(cache.get).toHaveBeenCalledWith('user:user-123');
      expect(cache.get).toHaveBeenCalledWith('template:welcome-email');
      expect(httpService.get).not.toHaveBeenCalled();
      expect(sendgridService.sendEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        from: 'noreply@example.com',
        subject: 'Test Email',
        html: '<h1>Hello John Doe</h1>',
      });
    });

    it('should fetch user from service on cache miss and cache it', async () => {
      // Arrange
      cache.get.mockResolvedValueOnce(null); // User cache miss
      cache.get.mockResolvedValueOnce(mockTemplate); // Template cache hit

      const userResponse = {
        data: {
          data: mockUser,
        },
      };

      httpService.get.mockReturnValueOnce(of(userResponse) as any);

      // Act
      const result = await service.processEmailJob(mockJobData);

      // Assert
      expect(result).toBe(true);
      expect(cache.get).toHaveBeenCalledWith('user:user-123');
      expect(httpService.get).toHaveBeenCalledWith('http://user-service/api/v1/users/user-123');
      expect(cache.set).toHaveBeenCalledWith('user:user-123', mockUser);
      expect(sendgridService.sendEmail).toHaveBeenCalled();
    });

    it('should fetch template from service on cache miss and cache it', async () => {
      // Arrange
      cache.get.mockResolvedValueOnce(mockUser); // User cache hit
      cache.get.mockResolvedValueOnce(null); // Template cache miss

      const templateResponse = {
        data: {
          html: mockTemplate,
        },
      };

      httpService.get.mockReturnValueOnce(of(templateResponse) as any);

      // Act
      const result = await service.processEmailJob(mockJobData);

      // Assert
      expect(result).toBe(true);
      expect(cache.get).toHaveBeenCalledWith('template:welcome-email');
      expect(httpService.get).toHaveBeenCalledWith('http://template-service/api/v1/templates/welcome-email');
      expect(cache.set).toHaveBeenCalledWith('template:welcome-email', mockTemplate);
      expect(sendgridService.sendEmail).toHaveBeenCalled();
    });

    it('should skip email if user has disabled email notifications', async () => {
      // Arrange
      const userWithDisabledEmail = {
        ...mockUser,
        preferences: {
          email: false,
        },
      };

      cache.get.mockResolvedValueOnce(userWithDisabledEmail);

      // Act
      const result = await service.processEmailJob(mockJobData);

      // Assert
      expect(result).toBe(true);
      expect(sendgridService.sendEmail).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('has disabled email notifications'),
      );
    });

    it('should skip email if user has no preferences', async () => {
      // Arrange
      const userWithoutPreferences = {
        ...mockUser,
        preferences: undefined,
      };

      cache.get.mockResolvedValueOnce(userWithoutPreferences);

      // Act
      const result = await service.processEmailJob(mockJobData);

      // Assert
      expect(result).toBe(true);
      expect(sendgridService.sendEmail).not.toHaveBeenCalled();
    });

    it('should compile handlebars template with variables', async () => {
      // Arrange
      const templateWithVariables = '<p>Hello {{name}}, welcome to {{platform}}!</p>';
      cache.get.mockResolvedValueOnce(mockUser);
      cache.get.mockResolvedValueOnce(templateWithVariables);

      const jobDataWithVariables = {
        ...mockJobData,
        variables: {
          name: 'Jane Doe',
          platform: 'MyApp',
        },
      };

      // Act
      await service.processEmailJob(jobDataWithVariables);

      // Assert
      expect(sendgridService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: '<p>Hello Jane Doe, welcome to MyApp!</p>',
        }),
      );
    });

    it('should throw error when user service fails', async () => {
      // Arrange
      cache.get.mockResolvedValueOnce(null); // User cache miss
      const error = new Error('User service unavailable');
      httpService.get.mockReturnValueOnce(throwError(() => error) as any);

      // Act & Assert
      await expect(service.processEmailJob(mockJobData)).rejects.toThrow('User service unavailable');
      expect(sendgridService.sendEmail).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Job failed'),
        expect.stringContaining('req-123'),
        expect.anything(),
      );
    });

    it('should throw error when template service fails', async () => {
      // Arrange
      cache.get.mockResolvedValueOnce(mockUser); // User cache hit
      cache.get.mockResolvedValueOnce(null); // Template cache miss
      const error = new Error('Template service unavailable');
      httpService.get.mockReturnValueOnce(throwError(() => error) as any);

      // Act & Assert
      await expect(service.processEmailJob(mockJobData)).rejects.toThrow('Template service unavailable');
      expect(sendgridService.sendEmail).not.toHaveBeenCalled();
    });

    it('should throw error when sendgrid service fails', async () => {
      // Arrange
      cache.get.mockResolvedValueOnce(mockUser);
      cache.get.mockResolvedValueOnce(mockTemplate);
      const error = new Error('SendGrid API error');
      sendgridService.sendEmail.mockRejectedValueOnce(error);

      // Act & Assert
      await expect(service.processEmailJob(mockJobData)).rejects.toThrow('SendGrid API error');
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Job failed'),
        expect.stringContaining('req-123'),
        expect.anything(),
      );
    });

    it('should handle circuit breaker timeout for user service', async () => {
      // Arrange
      cache.get.mockResolvedValueOnce(null); // User cache miss
      const timeoutError = new Error('Timeout');
      timeoutError.name = 'TimeoutError';
      httpService.get.mockReturnValueOnce(throwError(() => timeoutError) as any);

      // Act & Assert
      await expect(service.processEmailJob(mockJobData)).rejects.toThrow();
      expect(sendgridService.sendEmail).not.toHaveBeenCalled();
    });

    it('should log cache hits correctly', async () => {
      // Arrange
      cache.get.mockResolvedValueOnce(mockUser);
      cache.get.mockResolvedValueOnce(mockTemplate);

      // Act
      await service.processEmailJob(mockJobData);

      // Assert
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Cache hit for key: user:user-123'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Cache hit for key: template:welcome-email'));
    });

    it('should log cache misses correctly', async () => {
      // Arrange
      cache.get.mockResolvedValueOnce(null);
      cache.get.mockResolvedValueOnce(null);

      const userResponse = {
        data: {
          data: mockUser,
        },
      };

      const templateResponse = {
        data: {
          html: mockTemplate,
        },
      };

      httpService.get.mockReturnValueOnce(of(userResponse) as any);
      httpService.get.mockReturnValueOnce(of(templateResponse) as any);

      // Act
      await service.processEmailJob(mockJobData);

      // Assert
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Cache miss for key: user:user-123'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Cache miss for key: template:welcome-email'));
    });

    it('should log job completion successfully', async () => {
      // Arrange
      cache.get.mockResolvedValueOnce(mockUser);
      cache.get.mockResolvedValueOnce(mockTemplate);

      // Act
      await service.processEmailJob(mockJobData);

      // Assert
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Job completed successfully'),
        expect.stringContaining('req-123'),
      );
    });
  });
});

