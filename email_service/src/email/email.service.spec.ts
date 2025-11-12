import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';
import { SendgridService } from '../sendgrid/sendgrid.service';
import { EmailJobData } from './interfaces/email.types';

describe('EmailService', () => {
  let service: EmailService;
  let configService: jest.Mocked<ConfigService>;
  let sendgridService: jest.Mocked<SendgridService>;

  const mockJobData: EmailJobData = {
    user_id: 123,
    template_id: 'welcome-email',
    notification_type: 'email',
    correlation_id: 'corr-123',
    user_data: {
      id: 123,
      email: 'test@example.com',
      preferences: {
        email: true,
        push: true,
      },
    },
    template_content: 'Hello {{name}}, welcome to our service!',
    variables: {
      name: 'John Doe',
    },
  };

  beforeEach(async () => {
    const mockConfigService = {
      getOrThrow: jest.fn((key: string) => {
        const config: Record<string, string> = {
          SENDGRID_FROM_EMAIL: 'noreply@example.com',
        };
        return config[key];
      }),
    };

    const mockSendgridService = {
      sendEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: SendgridService,
          useValue: mockSendgridService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get(ConfigService);
    sendgridService = module.get(SendgridService);

    // Mock console methods to avoid cluttering test output
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processEmailJob', () => {
    it('should successfully process email job with provided data', async () => {
      // Act
      const result = await service.processEmailJob(mockJobData);

      // Assert
      expect(result).toBe(true);
      expect(sendgridService.sendEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        from: 'noreply@example.com',
        subject: 'Notification',
        html: 'Hello John Doe, welcome to our service!',
      });
    });

    it('should skip non-email notifications', async () => {
      // Arrange
      const pushNotificationData: EmailJobData = {
        ...mockJobData,
        notification_type: 'push',
      };

      // Act
      const result = await service.processEmailJob(pushNotificationData);

      // Assert
      expect(result).toBe(true);
      expect(sendgridService.sendEmail).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Skipping non-email notification'),
      );
    });

    it('should skip email if user has disabled email notifications', async () => {
      // Arrange
      const jobDataWithDisabledEmail: EmailJobData = {
        ...mockJobData,
        user_data: {
          ...mockJobData.user_data,
          preferences: {
            email: false,
            push: true,
          },
        },
      };

      // Act
      const result = await service.processEmailJob(jobDataWithDisabledEmail);

      // Assert
      expect(result).toBe(true);
      expect(sendgridService.sendEmail).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('has disabled email notifications'),
      );
    });

    it('should replace template variables with values', async () => {
      // Arrange
      const jobDataWithVariables: EmailJobData = {
        ...mockJobData,
        template_content: 'Hello {{name}}, welcome to {{platform}}!',
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
          html: 'Hello Jane Doe, welcome to MyApp!',
        }),
      );
    });

    it('should throw error when user email is missing', async () => {
      // Arrange
      const jobDataWithoutEmail: EmailJobData = {
        ...mockJobData,
        user_data: {
          ...mockJobData.user_data,
          email: '',
        },
      };

      // Act & Assert
      await expect(service.processEmailJob(jobDataWithoutEmail)).rejects.toThrow(
        'User email not found',
      );
      expect(sendgridService.sendEmail).not.toHaveBeenCalled();
    });

    it('should throw error when template content is missing', async () => {
      // Arrange
      const jobDataWithoutTemplate: EmailJobData = {
        ...mockJobData,
        template_content: '',
      };

      // Act & Assert
      await expect(service.processEmailJob(jobDataWithoutTemplate)).rejects.toThrow(
        'Template content not provided',
      );
      expect(sendgridService.sendEmail).not.toHaveBeenCalled();
    });

    it('should throw error when sendgrid service fails', async () => {
      // Arrange
      const error = new Error('SendGrid API error');
      sendgridService.sendEmail.mockRejectedValueOnce(error);

      // Act & Assert
      await expect(service.processEmailJob(mockJobData)).rejects.toThrow('SendGrid API error');
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Job failed'),
        expect.stringContaining('corr-123'),
        expect.anything(),
      );
    });

    it('should handle template without variables', async () => {
      // Arrange
      const jobDataWithoutVariables: EmailJobData = {
        ...mockJobData,
        template_content: 'Hello, welcome to our service!',
        variables: undefined,
      };

      // Act
      const result = await service.processEmailJob(jobDataWithoutVariables);

      // Assert
      expect(result).toBe(true);
      expect(sendgridService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: 'Hello, welcome to our service!',
        }),
      );
    });

    it('should log job completion successfully', async () => {
      // Act
      await service.processEmailJob(mockJobData);

      // Assert
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Job completed successfully'),
        expect.stringContaining('corr-123'),
      );
    });

    it('should handle partial variable substitution', async () => {
      // Arrange
      const jobDataWithPartialVariables: EmailJobData = {
        ...mockJobData,
        template_content: 'Hello {{name}}, your order {{order_id}} is ready!',
        variables: {
          name: 'John Doe',
          // order_id is missing
        },
      };

      // Act
      await service.processEmailJob(jobDataWithPartialVariables);

      // Assert
      expect(sendgridService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: 'Hello John Doe, your order {{order_id}} is ready!',
        }),
      );
    });
  });
});
