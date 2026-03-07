import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { IEncryptionService } from './encryption.service.interface';

@Injectable()
export class BcryptEncryptionService implements IEncryptionService {
  private readonly SALT_ROUNDS = 10;

  async hash(data: string): Promise<string> {
    return await bcrypt.hash(data, this.SALT_ROUNDS);
  }

  async compare(data: string, encrypted: string): Promise<boolean> {
    return await bcrypt.compare(data, encrypted);
  }
}