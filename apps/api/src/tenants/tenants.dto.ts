import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, IsUrl, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export const OBJECTIVES = ['more_leads', 'brand_awareness', 'more_store_visits', 'online_sales', 'grow_social', 'retain_customers'] as const;
export const CATEGORIES = ['retail', 'restaurant', 'salon_wellness', 'real_estate', 'clinic', 'coaching', 'other'] as const;

export class UpdateProfileDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @IsIn(CATEGORIES as unknown as string[]) category?: string;
  @IsOptional() @IsString() @MaxLength(120) industry?: string;
  @IsOptional() @IsUrl({ require_protocol: true }, { message: 'Enter a full website address starting with https://' }) website?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsString() @MaxLength(300) targetAudience?: string;
  @IsOptional() @IsString() @MaxLength(200) targetLocation?: string;
  @IsOptional() @IsIn(['en', 'gu', 'hi']) language?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(6) @IsIn(OBJECTIVES as unknown as string[], { each: true }) objectives?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(5) @Matches(/^#[0-9a-fA-F]{6}$/, { each: true, message: 'Colours must be hex values like #0F766E' }) brandColors?: string[];
  @IsOptional() @IsInt() @Min(2) @Max(6) step?: number;
}

export class LocationDto {
  @IsString() @MinLength(2) @MaxLength(120) name: string;
  @IsOptional() @IsString() @MaxLength(300) address?: string;
  @IsString() @MinLength(2) @MaxLength(100) city: string;
  @IsString() @MinLength(2) @MaxLength(100) state: string;
  @IsOptional() @IsString() @MaxLength(100) country?: string;
}
