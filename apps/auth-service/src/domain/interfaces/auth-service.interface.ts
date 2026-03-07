import { LoginDto } from '../../application/dtos/login.dto';

export interface IAuthService {
  validateUser(loginDto: LoginDto): Promise<any>;
  login(user: any): Promise<{ access_token: string }>;
}