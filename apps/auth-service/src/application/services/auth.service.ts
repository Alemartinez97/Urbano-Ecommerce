import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { LoginDto } from '../dtos/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  // Valida el usuario usando correo y contraseña (Se dejará por retrocompatibilidad temporal, pero el flujo principal será Google)
  async validateUser(loginDto: LoginDto): Promise<any> {
    const usersUrl = this.configService.get<string>('USERS_SERVICE_URL');
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(`${usersUrl}/api/v1/users/validate`, {
          email: loginDto.email,
          password: loginDto.password,
        })
      );
      return data?.user ?? null;
    } catch {
      return null;
    }
  }

  // Valida o crea un usuario a través del servicio de usuarios usando los datos de Google
  async validateOAuthUser(profile: { googleId: string; email: string; firstName: string; lastName: string }): Promise<any> {
    const usersUrl = this.configService.get<string>('USERS_SERVICE_URL');
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(`${usersUrl}/api/v1/users/oauth/google`, profile)
      );
      return data?.user ?? null;
    } catch (error) {
      console.error('Error al validar/crear usuario de Google', error);
      return null;
    }
  }

  // Genera el token JWT una vez que el usuario ha sido validado (ya sea por Google o correo)
  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}