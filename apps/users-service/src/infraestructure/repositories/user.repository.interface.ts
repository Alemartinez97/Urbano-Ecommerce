import { UserEntity } from '../persistence/user.entity';

export interface UserRepository {
  save(user: Partial<UserEntity>): Promise<UserEntity>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findById(id: string): Promise<UserEntity | null>;
}