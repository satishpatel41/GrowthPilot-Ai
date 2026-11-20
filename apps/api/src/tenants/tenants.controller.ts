import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { SessionUser } from '../common/auth.types';
import { CurrentUser } from '../common/current-user';
import { Roles } from '../common/session.guard';
import { LocationDto, UpdateProfileDto } from './tenants.dto';
import { TenantsService } from './tenants.service';

@Roles('CUSTOMER')
@Controller('tenant')
export class TenantsController {
  constructor(private svc: TenantsService) {}

  @Get() get(@CurrentUser() u: SessionUser) { return this.svc.get(u); }
  @Put('profile') update(@CurrentUser() u: SessionUser, @Body() dto: UpdateProfileDto) { return this.svc.updateProfile(u, dto); }
  @Post('locations') add(@CurrentUser() u: SessionUser, @Body() dto: LocationDto) { return this.svc.addLocation(u, dto); }
  @Delete('locations/:id') remove(@CurrentUser() u: SessionUser, @Param('id', ParseUUIDPipe) id: string) { return this.svc.removeLocation(u, id); }
  @HttpCode(200) @Post('onboarding/complete') complete(@CurrentUser() u: SessionUser) { return this.svc.completeOnboarding(u); }
}
