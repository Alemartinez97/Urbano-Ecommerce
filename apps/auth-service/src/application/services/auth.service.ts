import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as bcrypt from 'bcrypt';
import { LoginDto } from '../dtos/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(loginDto: LoginDto): Promise<any> {
    const usersUrl = this.configService.get<string>('USERS_SERVICE_URL');
    
    try {
      // Llamada al endpoint de users-service que busca por email
      const { data: user } = await firstValueFrom(
        this.httpService.get(`${usersUrl}/users/email/${loginDto.email}`)
      );

      if (user && await bcrypt.compare(loginDto.password, user.password)) {
        const { password, ...result } = user;
        return result;
      }
    } catch (error) {
      return null;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}