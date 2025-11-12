import { Test, TestingModule } from '@nestjs/testing';
import { SendgridService } from './sendgrid.service';
import { ConfigService } from '@nestjs/config';
import * as sendGridMail from '@sendgrid/mail';

// Mock the sendgrid module
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn(),
}));

describe('SendgridService', () => {
  let service: SendgridService;
  let configService: jest.Mocked<ConfigService>;
  const mockSendGridMail = sendGridMail as jest.Mocked<typeof sendGridMail>;

  beforeEach(async () => {
    const mockConfigService = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'SENDGRID_API_KEY') {
          return 'test-api-key-123';
        }
        throw new Error(`Config key ${key} not found`);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SendgridService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SendgridService>(SendgridService);
    configService = module.get(ConfigService);

    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should set SendGrid API key on module initialization', async () => {
      // The onModuleInit is called automatically during module initialization
      // We need to initialize the module to trigger onModuleInit
      await service.onModuleInit();
      
      expect(mockSendGridMail.setApiKey).toHaveBeenCalledWith('test-api-key-123');
      expect(configService.getOrThrow).toHaveBeenCalledWith('SENDGRID_API_KEY');
    });

    it('should throw error if API key is not configured', async () => {
      // Arrange
      const mockConfigServiceWithoutKey = {
        getOrThrow: jest.fn().mockImplementation(() => {
          throw new Error('SENDGRID_API_KEY not found');
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SendgridService,
          {
            provide: ConfigService,
            useValue: mockConfigServiceWithoutKey,
          },
        ],
      }).compile();

      const serviceWithoutKey = module.get<SendgridService>(SendgridService);

      // Act & Assert
      expect(() => {
        serviceWithoutKey.onModuleInit();
      }).toThrow('SENDGRID_API_KEY not found');
      expect(mockConfigServiceWithoutKey.getOrThrow).toHaveBeenCalledWith('SENDGRID_API_KEY');
    });
  });

  describe('sendEmail', () => {
    const mockEmailData = {
      to: 'recipient@example.com',
      from: 'sender@example.com',
      subject: 'Test Email',
      html: '<h1>Test Content</h1>',
    };

    it('should send email successfully', async () => {
      // Arrange
      mockSendGridMail.send.mockResolvedValueOnce([{ statusCode: 202 } as any, {}]);

      // Act
      await service.sendEmail(mockEmailData);

      // Assert
      expect(mockSendGridMail.send).toHaveBeenCalledWith(mockEmailData);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Email sent successfully to: recipient@example.com'),
      );
      expect(console.error).not.toHaveBeenCalled();
    });

    it('should throw error when SendGrid API fails', async () => {
      // Arrange
      const error = new Error('SendGrid API error');
      mockSendGridMail.send.mockRejectedValueOnce(error);

      // Act & Assert
      await expect(service.sendEmail(mockEmailData)).rejects.toThrow('SendGrid API error');
      expect(console.error).toHaveBeenCalledWith('Error sending email:', error);
    });

    it('should handle SendGrid rate limit errors', async () => {
      // Arrange
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.name = 'RateLimitError';
      mockSendGridMail.send.mockRejectedValueOnce(rateLimitError);

      // Act & Assert
      await expect(service.sendEmail(mockEmailData)).rejects.toThrow('Rate limit exceeded');
      expect(console.error).toHaveBeenCalledWith('Error sending email:', rateLimitError);
    });

    it('should handle SendGrid authentication errors', async () => {
      // Arrange
      const authError = new Error('Unauthorized');
      authError.name = 'UnauthorizedError';
      mockSendGridMail.send.mockRejectedValueOnce(authError);

      // Act & Assert
      await expect(service.sendEmail(mockEmailData)).rejects.toThrow('Unauthorized');
      expect(console.error).toHaveBeenCalledWith('Error sending email:', authError);
    });

    it('should send email with different recipients', async () => {
      // Arrange
      const emailWithMultipleRecipients = {
        ...mockEmailData,
        to: ['recipient1@example.com', 'recipient2@example.com'],
      };
      mockSendGridMail.send.mockResolvedValueOnce([{ statusCode: 202 } as any, {}]);

      // Act
      await service.sendEmail(emailWithMultipleRecipients);

      // Assert
      expect(mockSendGridMail.send).toHaveBeenCalledWith(emailWithMultipleRecipients);
    });

    it('should send email with text content', async () => {
      // Arrange
      const emailWithText = {
        ...mockEmailData,
        text: 'Plain text content',
      };
      mockSendGridMail.send.mockResolvedValueOnce([{ statusCode: 202 } as any, {}]);

      // Act
      await service.sendEmail(emailWithText);

      // Assert
      expect(mockSendGridMail.send).toHaveBeenCalledWith(emailWithText);
    });

    it('should send email with attachments', async () => {
      // Arrange
      const emailWithAttachments = {
        ...mockEmailData,
        attachments: [
          {
            content: 'base64encodedcontent',
            filename: 'document.pdf',
            type: 'application/pdf',
          },
        ],
      };
      mockSendGridMail.send.mockResolvedValueOnce([{ statusCode: 202 } as any, {}]);

      // Act
      await service.sendEmail(emailWithAttachments);

      // Assert
      expect(mockSendGridMail.send).toHaveBeenCalledWith(emailWithAttachments);
    });

    it('should handle network timeout errors', async () => {
      // Arrange
      const timeoutError = new Error('Network timeout');
      timeoutError.name = 'TimeoutError';
      mockSendGridMail.send.mockRejectedValueOnce(timeoutError);

      // Act & Assert
      await expect(service.sendEmail(mockEmailData)).rejects.toThrow('Network timeout');
    });
  });
});

