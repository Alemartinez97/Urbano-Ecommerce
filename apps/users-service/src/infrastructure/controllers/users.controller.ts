import { Controller, Post, Body, Get, Param, ParseUUIDPipe, UseInterceptors, ClassSerializerInterceptor, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { CreateUserDto } from '../../application/dtos/create-user.dto';
import { UsersService } from '../../application/services/users.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

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

  @Post('validate')
  async validateCredentials(@Body() body: ValidateCredentialsDto) {
    const user = await this.usersService.validateCredentials(body.email, body.password);
    if (!user) throw new UnauthorizedException('Credenciales inválidas');
    return { user };
  }

  @Get('email/:email')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  async findByEmail(@Param('email') email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;
    return user;
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.usersService.findOne(id);
  }
}