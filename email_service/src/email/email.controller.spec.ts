import { Test, TestingModule } from '@nestjs/testing';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { RmqContext } from '@nestjs/microservices';
import { EmailJobData } from './interfaces/email.types';

describe('EmailController', () => {
  let controller: EmailController;
  let emailService: jest.Mocked<EmailService>;
  let mockChannel: any;
  let mockMessage: any;
  let mockContext: RmqContext;

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
    template_content: 'Hello {{name}}, welcome!',
    variables: {
      name: 'John Doe',
    },
  };

  beforeEach(async () => {
    const mockEmailService = {
      processEmailJob: jest.fn(),
    };

    mockChannel = {
      ack: jest.fn(),
      nack: jest.fn(),
    };

    mockMessage = {
      content: Buffer.from(JSON.stringify(mockJobData)),
      properties: {},
      fields: {},
    };

    mockContext = {
      getChannelRef: jest.fn().mockReturnValue(mockChannel),
      getMessage: jest.fn().mockReturnValue(mockMessage),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailController],
      providers: [
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    controller = module.get<EmailController>(EmailController);
    emailService = module.get(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleEmailJob', () => {
    it('should process email job successfully and acknowledge message', async () => {
      // Arrange
      emailService.processEmailJob.mockResolvedValueOnce(true);

      // Act
      await controller.handleEmailJob(mockJobData, mockContext);

      // Assert
      expect(emailService.processEmailJob).toHaveBeenCalledWith(mockJobData);
      expect(mockContext.getChannelRef).toHaveBeenCalled();
      expect(mockContext.getMessage).toHaveBeenCalled();
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });

    it('should nack message when email service throws error', async () => {
      // Arrange
      const error = new Error('Email processing failed');
      emailService.processEmailJob.mockRejectedValueOnce(error);

      // Act
      await controller.handleEmailJob(mockJobData, mockContext);

      // Assert
      expect(emailService.processEmailJob).toHaveBeenCalledWith(mockJobData);
      expect(mockChannel.ack).not.toHaveBeenCalled();
      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, false);
    });

    it('should handle different job data formats', async () => {
      // Arrange
      const differentJobData: EmailJobData = {
        user_id: 456,
        template_id: 'notification-email',
        notification_type: 'email',
        correlation_id: 'corr-456',
        user_data: {
          id: 456,
          email: 'another@example.com',
          preferences: {
            email: true,
            push: false,
          },
        },
        template_content: 'Test notification',
        variables: {
          message: 'Test notification',
        },
      };

      emailService.processEmailJob.mockResolvedValueOnce(true);

      // Act
      await controller.handleEmailJob(differentJobData, mockContext);

      // Assert
      expect(emailService.processEmailJob).toHaveBeenCalledWith(differentJobData);
      expect(mockChannel.ack).toHaveBeenCalled();
    });

    it('should nack message on service timeout', async () => {
      // Arrange
      const timeoutError = new Error('Service timeout');
      timeoutError.name = 'TimeoutError';
      emailService.processEmailJob.mockRejectedValueOnce(timeoutError);

      // Act
      await controller.handleEmailJob(mockJobData, mockContext);

      // Assert
      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, false);
      expect(mockChannel.ack).not.toHaveBeenCalled();
    });

    it('should nack message on network errors', async () => {
      // Arrange
      const networkError = new Error('Network error');
      networkError.name = 'NetworkError';
      emailService.processEmailJob.mockRejectedValueOnce(networkError);

      // Act
      await controller.handleEmailJob(mockJobData, mockContext);

      // Assert
      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, false);
    });
  });
});
