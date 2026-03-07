import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ description: 'Nombre del usuario', example: 'Roberto' })
  @IsString()
  name: string;
  @ApiProperty({ description: 'Correo', example: 'Roberto@gmail.com' })
  @IsEmail({}, { message: 'El formato del correo es inválido' })
  email: string;
  @ApiProperty({ description: 'Clave', example: 'dajideqjdean' })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @ApiProperty({ description: 'Primer nombre', example: 'Roberto' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Segundo nombre', example: 'Roberto' })
  @IsString()
  lastName: string;
}