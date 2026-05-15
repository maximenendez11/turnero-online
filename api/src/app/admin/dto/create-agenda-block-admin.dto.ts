import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const ON_CONFLICT = ['fail', 'cancel_silent', 'cancel_with_notice'] as const;
export type AgendaBlockOnConflict = (typeof ON_CONFLICT)[number];

export class CreateAgendaBlockAdminDto {
  @IsString()
  startsAt!: string;

  @IsString()
  endsAt!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;

  /** Si true, solo devuelve turnos superpuestos sin persistir el bloqueo. */
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  /** Si hay turnos en la franja: abortar, cancelarlos sin aviso, o cancelar e intentar avisar por mail / sugerir WhatsApp. */
  @IsOptional()
  @IsIn(ON_CONFLICT)
  onConflict?: AgendaBlockOnConflict;
}
