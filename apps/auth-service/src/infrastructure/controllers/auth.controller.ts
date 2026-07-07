import { Controller, Get, Post, Body, UnauthorizedException, HttpCode, HttpStatus, UseGuards, Req, Res } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '../../application/services/auth.service';
import { LoginDto } from '../../application/dtos/login.dto';
import type { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  // Endpoint clásico de login por contraseña (Se mantiene temporalmente por si hay usuarios antiguos)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(loginDto);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return this.authService.login(user);
  }

  // Inicia el flujo de autenticación con Google (Redirige a la pantalla de login de Google)
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req: Request) {
    // La guardia 'google' se encarga de la redirección automática
  }

  // Callback al que Google redirige después de que el usuario acepta los permisos
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    // req.user contiene el perfil procesado por nuestra GoogleStrategy
    const loginData = await this.authService.login(req.user);

    // Aquí puedes redirigir al frontend pasando el token en la URL, 
    // o establecer una cookie HTTP-only
    return res.json({
      message: 'Autenticación exitosa',
      token: loginData.access_token,
      // URL de ejemplo para el frontend
      // redirectUrl: `http://localhost:3000/dashboard?token=${loginData.access_token}`
    });
  }
}