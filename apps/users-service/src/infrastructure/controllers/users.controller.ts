import { Controller, Post, Body, Get, Param, ParseUUIDPipe, UseInterceptors, ClassSerializerInterceptor, UnauthorizedException } from '@nestjs/common';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { CreateUserDto } from '../../application/dtos/create-user.dto';
import { UsersService } from '../../application/services/users.service';

export class ValidateCredentialsDto {
  @IsEmail()
  email: string;
  @IsString()
  @MinLength(6)
  password: string;
}

@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return await this.usersService.create(createUserDto);
  }

  /** Usado por auth-service para login: valida email+password y devuelve usuario sin password. */
  @Post('validate')
  async validateCredentials(@Body() body: ValidateCredentialsDto) {
    const user = await this.usersService.validateCredentials(body.email, body.password);
    if (!user) throw new UnauthorizedException('Credenciales inválidas');
    return { user };
  }

  @Get('email/:email')
  async findByEmail(@Param('email') email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;
    return user;
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    // El ParseUUIDPipe valida que el ID sea un UUID válido antes de entrar al servicio
    return await this.usersService.findOne(id);
  }
}