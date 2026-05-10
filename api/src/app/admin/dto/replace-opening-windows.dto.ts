import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, Max, Min, ValidateNested } from 'class-validator';

export class OpeningWindowItemDto {
  @IsInt()
  @Min(0)
  @Max(6)
  weekday!: number;

  @IsInt()
  @Min(0)
  @Max(24 * 60)
  startMin!: number;

  @IsInt()
  @Min(0)
  @Max(24 * 60)
  endMin!: number;

  @IsInt()
  @Min(0)
  sortOrder!: number;
}

export class ReplaceOpeningWindowsDto {
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => OpeningWindowItemDto)
  windows!: OpeningWindowItemDto[];
}
