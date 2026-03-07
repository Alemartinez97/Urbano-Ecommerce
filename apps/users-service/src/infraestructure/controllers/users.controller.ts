import { Controller, Post, Body, Get, Param, ParseUUIDPipe, UseInterceptors, ClassSerializerInterceptor } from '@nestjs/common';
import { CreateUserDto } from '../../application/dtos/create-user.dto';
import { UsersService } from '../../application/services/users.service';

@Controller('users')
// Esta buena práctica de NestJS asegura que los campos marcados con @Exclude() 
// en la entidad no se envíen en el JSON de respuesta.
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    // Llamamos a la lógica que ya pulimos con Bcrypt
    return await this.usersService.create(createUserDto);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    // El ParseUUIDPipe valida que el ID sea un UUID válido antes de entrar al servicio
    return await this.usersService.findOne(id);
  }
}