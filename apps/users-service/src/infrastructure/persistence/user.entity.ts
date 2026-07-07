import { Exclude } from 'class-transformer';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne } from 'typeorm';
import { ProviderProfileEntity } from './provider-profile.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true, nullable: true })
  googleId: string;

  @Exclude()
  @Column({ select: false, nullable: true }) // Nullable because of Google OAuth
  password?: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ default: 'CUSTOMER' }) // 'CUSTOMER', 'PROVIDER' o 'ADMIN'
  role: string;

  @CreateDateColumn()
  createdAt: Date;

  // Relación con el perfil de proveedor (Solo tendrá datos si el rol es PROVIDER)
  @OneToOne(() => ProviderProfileEntity, profile => profile.user, { cascade: true, nullable: true })
  providerProfile: ProviderProfileEntity;
}