import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../../application/services/auth.service';

@Injectable()
// Esta estrategia intercepta el flujo de OAuth de Google.
// Se encarga de usar las credenciales de la app y extraer el perfil del usuario.
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || 'dummy_id',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || 'dummy_secret',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || 'http://localhost:3003/api/v1/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  // Este método se ejecuta automáticamente cuando Google nos devuelve el perfil del usuario validado
  async validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback): Promise<any> {
    const { name, emails, id } = profile;
    const userProfile = {
      googleId: id,
      email: emails[0].value,
      firstName: name.givenName,
      lastName: name.familyName,
    };
    
    // Call authService to validate or create user in users-service
    const user = await this.authService.validateOAuthUser(userProfile);
    done(null, user);
  }
}
