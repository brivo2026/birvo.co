import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  loginSchema,
  registerOrganizationSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  type LoginDto,
  type RegisterOrganizationDto,
  type RequestPasswordResetDto,
  type ResetPasswordDto,
  type SessionUser,
} from '@birvo/contracts';
import { AuthService } from './auth.service';
import { SessionService } from '../../common/services/session.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from './dto/zod-dto';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
  ) {}

  @Post('register')
  @Public()
  @HttpCode(201)
  async register(
    @Body(new ZodValidationPipe(registerOrganizationSchema)) dto: RegisterOrganizationDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const { token, sessionUser } = await this.authService.registerOrganization(dto);
    void reply.setCookie(this.sessionService.cookieName, token, this.sessionService.cookieOptions());
    return { user: sessionUser };
  }

  @Post('login')
  @Public()
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) dto: LoginDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const { token, sessionUser } = await this.authService.login(dto, {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
    void reply.setCookie(this.sessionService.cookieName, token, this.sessionService.cookieOptions());
    return { user: sessionUser };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@CurrentUser() user: SessionUser, @Res({ passthrough: true }) reply: FastifyReply) {
    await this.authService.logout(user.userId, user.organizationId);
    void reply.clearCookie(this.sessionService.cookieName, { path: '/' });
    return { success: true };
  }

  @Post('logout-all-sessions')
  @HttpCode(200)
  async logoutAll(@CurrentUser() user: SessionUser, @Res({ passthrough: true }) reply: FastifyReply) {
    await this.authService.revokeAllSessions(user.userId);
    void reply.clearCookie(this.sessionService.cookieName, { path: '/' });
    return { success: true };
  }

  @Get('me')
  me(@CurrentUser() user: SessionUser) {
    return { user };
  }

  @Post('password/forgot')
  @Public()
  @HttpCode(200)
  async forgotPassword(
    @Body(new ZodValidationPipe(requestPasswordResetSchema)) dto: RequestPasswordResetDto,
  ) {
    await this.authService.requestPasswordReset(dto.email);
    // Respuesta genérica siempre, para no filtrar si el correo existe.
    return { message: 'Si el correo existe, se enviaron instrucciones de recuperación.' };
  }

  @Post('password/reset')
  @Public()
  @HttpCode(200)
  async resetPassword(@Body(new ZodValidationPipe(resetPasswordSchema)) dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.password);
    return { message: 'Contraseña actualizada correctamente.' };
  }
}
