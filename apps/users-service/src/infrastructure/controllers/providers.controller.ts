import { Controller, Post, Get, Body, Query, UseGuards, Req, Logger } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { UsersService } from '../../application/services/users.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('Proveedores (Providers)')
@Controller('providers')
export class ProvidersController {
  private readonly logger = new Logger(ProvidersController.name);

  constructor(private readonly usersService: UsersService) {}

  // Consulta cuántos proveedores de una categoría específica están online en la geocerca
  // GET /api/v1/providers/active-count?category=STAFF&latitude=-34.6037&longitude=-58.3816&radiusKm=10
  @Get('active-count')
  @ApiOperation({ summary: 'Obtener la cantidad de proveedores activos online en una geocerca' })
  @ApiQuery({ name: 'category', type: String, required: true })
  @ApiQuery({ name: 'latitude', type: Number, required: true })
  @ApiQuery({ name: 'longitude', type: Number, required: true })
  @ApiQuery({ name: 'radiusKm', type: Number, required: false, defaultValue: 10 })
  async getActiveCount(
    @Query('category') category: string,
    @Query('latitude') latitude: number,
    @Query('longitude') longitude: number,
    @Query('radiusKm') radiusKm?: number,
  ) {
    const limitKm = radiusKm ? Number(radiusKm) : 10;
    const count = await this.usersService.getActiveProvidersCount(
      category,
      Number(latitude),
      Number(longitude),
      limitKm,
    );
    return { count };
  }

  // Consulta la lista ordenada de proveedores activos geocercanos
  // GET /api/v1/providers/active-list?category=STAFF&latitude=-34.6037&longitude=-58.3816&radiusKm=10
  @Get('active-list')
  @ApiOperation({ summary: 'Obtener la lista ordenada de proveedores activos online en una geocerca' })
  @ApiQuery({ name: 'category', type: String, required: true })
  @ApiQuery({ name: 'latitude', type: Number, required: true })
  @ApiQuery({ name: 'longitude', type: Number, required: true })
  @ApiQuery({ name: 'radiusKm', type: Number, required: false, defaultValue: 10 })
  async getActiveList(
    @Query('category') category: string,
    @Query('latitude') latitude: number,
    @Query('longitude') longitude: number,
    @Query('radiusKm') radiusKm?: number,
  ) {
    const limitKm = radiusKm ? Number(radiusKm) : 10;
    return await this.usersService.getActiveProvidersList(
      category,
      Number(latitude),
      Number(longitude),
      limitKm,
    );
  }

  // Conectar/Desconectar el perfil de proveedor
  // POST /api/v1/providers/toggle-online
  @Post('toggle-online')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Conectar o desconectar al proveedor y enviar su ubicación en tiempo real' })
  async toggleOnline(
    @Req() req: any,
    @Body() body: { isOnline: boolean; latitude?: number; longitude?: number },
  ) {
    // req.user.userId viene del token JWT
    const userId = req.user?.userId || 'test-provider-id';
    const user = await this.usersService.toggleOnline(
      userId,
      body.isOnline,
      body.latitude,
      body.longitude,
    );
    return {
      message: body.isOnline ? 'Proveedor conectado' : 'Proveedor desconectado',
      isOnline: user.providerProfile?.isOnline ?? false,
      latitude: user.providerProfile?.latitude ?? null,
      longitude: user.providerProfile?.longitude ?? null,
    };
  }
}
