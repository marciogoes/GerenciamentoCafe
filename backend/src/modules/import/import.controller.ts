import {
  Controller, Get, Post, Param, Body,
  UseGuards, UseInterceptors, UploadedFile,
  Res, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor }   from '@nestjs/platform-express';
import { Response }          from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { memoryStorage }     from 'multer';

import { JwtAuthGuard, RolesGuard, Roles, TenantId, CurrentUser, PERFIS } from '../../common/guards/auth.guards';
import { ImportService }          from './import.service';
import { ConfirmarImportacaoDto, TIPOS_IMPORTACAO, TipoImportacao } from './dto/import.dto';

@ApiTags('Importação')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('import')
export class ImportController {

  constructor(private readonly importSvc: ImportService) {}

  // ── GET /import/template/:tipo ────────────────────────────────
  @Get('template/:tipo')
  @ApiOperation({ summary: 'Baixar template Excel para importação (Seção 3.3)' })
  async template(
    @Param('tipo') tipo: string,
    @Res() res: Response,
  ) {
    if (!TIPOS_IMPORTACAO.includes(tipo as TipoImportacao)) {
      throw new BadRequestException(`Tipo inválido. Use: ${TIPOS_IMPORTACAO.join(', ')}`);
    }
    const buffer = await this.importSvc.gerarTemplate(tipo as TipoImportacao);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="template-importacao-${tipo}.xlsx"`,
    });
    res.send(buffer);
  }

  // ── POST /import/validate ─────────────────────────────────────
  @Post('validate')
  @Roles(PERFIS.ADMIN, PERFIS.FINANCEIRO, PERFIS.OPERACIONAL)
  @ApiOperation({ summary: 'Validar arquivo Excel antes de importar (Seção 3.3)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        tipo: { type: 'string', enum: [...TIPOS_IMPORTACAO] },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits:  { fileSize: 5 * 1024 * 1024 }, // 5 MB máximo
    fileFilter: (_req, file, cb) => {
      const ok = file.mimetype.includes('spreadsheet')
              || file.originalname.endsWith('.xlsx')
              || file.originalname.endsWith('.xls');
      ok ? cb(null, true) : cb(new BadRequestException('Apenas arquivos .xlsx são aceitos.'), false);
    },
  }))
  async validar(
    @TenantId() tenantId: string,
    @UploadedFile() file: { buffer: Buffer; mimetype: string; originalname: string; size: number },
    @Body('tipo') tipo: string,
  ) {
    if (!file)  throw new BadRequestException('Arquivo Excel obrigatório.');
    if (!TIPOS_IMPORTACAO.includes(tipo as TipoImportacao)) {
      throw new BadRequestException(`Tipo inválido. Use: ${TIPOS_IMPORTACAO.join(', ')}`);
    }

    const resultado = await this.importSvc.validar(tenantId, tipo as TipoImportacao, file.buffer);

    return {
      tipo,
      total_lido:    resultado.valid.length + resultado.errors.length,
      validos:       resultado.valid.length,
      com_erro:      resultado.errors.length,
      preview_dados: resultado.valid,
      erros:         resultado.errors,
    };
  }

  // ── POST /import/confirm ──────────────────────────────────────
  @Post('confirm')
  @Roles(PERFIS.ADMIN, PERFIS.FINANCEIRO, PERFIS.OPERACIONAL)
  @ApiOperation({ summary: 'Confirmar e persistir os dados importados (Seção 3.3)' })
  async confirmar(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: ConfirmarImportacaoDto,
  ) {
    if (!dto.rows?.length) throw new BadRequestException('Nenhuma linha para importar.');

    const resultado = await this.importSvc.confirmar(
      tenantId, dto.tipo, dto.rows, user.userId,
    );

    return {
      sucesso: true,
      tipo:    dto.tipo,
      ...resultado,
      mensagem: `Importação concluída: ${resultado.importados} registro(s) importado(s), ${resultado.ignorados} ignorado(s) (já existiam).`,
    };
  }

  // ── GET /import/logs ──────────────────────────────────────────
  @Get('logs')
  @Roles(PERFIS.ADMIN)
  @ApiOperation({ summary: 'Histórico de importações do tenant' })
  async logs(@TenantId() tenantId: string) {
    // Query direta na tabela log_importacao
    return this.importSvc['dataSource'].query(
      `SELECT li.id, li.tipo, li.status, li.total_linhas, li.importados, li.erros,
              li.criado_em, u.nome AS usuario_nome
       FROM log_importacao li
       LEFT JOIN usuario u ON u.id = li.usuario_id AND u.tenant_id = li.tenant_id
       WHERE li.tenant_id = ?
       ORDER BY li.criado_em DESC
       LIMIT 50`,
      [tenantId],
    );
  }
}
