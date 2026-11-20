import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { SessionUser } from '../common/auth.types';
import { CurrentUser } from '../common/current-user';
import { Roles } from '../common/session.guard';
import { AssignmentsDto, AuditQuery, CreateStaffDto, ListCustomersQuery, SetStatusDto } from './admin.dto';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private svc: AdminService) {}

  @Roles('SUPER_ADMIN', 'AGENCY_STAFF') @Get('stats')
  stats(@CurrentUser() u: SessionUser) { return this.svc.stats(u); }

  @Roles('SUPER_ADMIN', 'AGENCY_STAFF') @Get('customers')
  customers(@CurrentUser() u: SessionUser, @Query() q: ListCustomersQuery) { return this.svc.listCustomers(u, q); }

  @Roles('SUPER_ADMIN', 'AGENCY_STAFF') @Get('customers/:id')
  customer(@CurrentUser() u: SessionUser, @Param('id', ParseUUIDPipe) id: string) { return this.svc.customer(u, id); }

  @Roles('SUPER_ADMIN') @Patch('customers/:id/status')
  status(@CurrentUser() u: SessionUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SetStatusDto) { return this.svc.setStatus(u, id, dto.status); }

  @Roles('SUPER_ADMIN') @Put('customers/:id/assignments')
  assign(@CurrentUser() u: SessionUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignmentsDto) { return this.svc.setAssignments(u, id, dto.userIds); }

  @Roles('SUPER_ADMIN') @Get('team')
  team() { return this.svc.team(); }

  @Roles('SUPER_ADMIN') @Post('team')
  createStaff(@CurrentUser() u: SessionUser, @Body() dto: CreateStaffDto) { return this.svc.createStaff(u, dto); }

  @Roles('SUPER_ADMIN') @Patch('team/:id/status')
  staffStatus(@CurrentUser() u: SessionUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SetStatusDto) { return this.svc.setStaffStatus(u, id, dto.status); }

  @Roles('SUPER_ADMIN') @Get('audit-logs')
  logs(@Query() q: AuditQuery) { return this.svc.auditLogs(q); }
}
