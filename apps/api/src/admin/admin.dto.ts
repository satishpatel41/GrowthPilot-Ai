import { ArrayMaxSize, IsArray, IsEmail, IsIn, IsOptional, IsString, IsUUID, Length, Matches, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class ListCustomersQuery {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsIn(['ONBOARDING', 'ACTIVE', 'SUSPENDED']) status?: string;
  @IsOptional() @Transform(({ value }) => Number(value)) @Min(1) page?: number;
  @IsOptional() @Transform(({ value }) => Number(value)) @Min(1) @Max(100) pageSize?: number;
}

export class SetStatusDto { @IsIn(['ACTIVE', 'SUSPENDED']) status: 'ACTIVE' | 'SUSPENDED'; }

export class AssignmentsDto { @IsArray() @ArrayMaxSize(50) @IsUUID('4', { each: true }) userIds: string[]; }

export class CreateStaffDto {
  @IsString() @Length(2, 100) name: string;
  @IsEmail() email: string;
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).{8,72}$/, { message: 'Password needs 8 to 72 characters with at least one letter and one number' }) password: string;
}

export class AuditQuery {
  @IsOptional() @IsUUID() tenantId?: string;
  @IsOptional() @Transform(({ value }) => Number(value)) @Min(1) @Max(200) limit?: number;
}
