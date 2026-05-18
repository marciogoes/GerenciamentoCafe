import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard }   from '../../common/guards/auth.guards';
import { DosesService }   from './doses.service';
import {
  CriarLeituraDto, AtualizarLeituraDto, MarcarEnvioDto, FiltrosLeituraDto,
} from './dto/doses.dto';

@UseGuards(JwtAuthGuard)
@Controller('doses')
export class DosesController {
  constructor(private readonly dosesService: DosesService) {}

  // GET /doses?cliente_id=&contrato_id=&competencia=&enviado=
  @Get()
  listar(@Request() req, @Query() filtros: FiltrosLeituraDto) {
    return this.dosesService.listar(req.user.tenantId, filtros);
  }

  // GET /doses/resumo?meses=6
  @Get('resumo')
  resumo(@Request() req, @Query('meses') meses?: string) {
    return this.dosesService.resumoMensal(req.user.tenantId, meses ? Number(meses) : 6);
  }

  // GET /doses/pendente-envio
  @Get('pendente-envio')
  pendenteEnvio(@Request() req) {
    return this.dosesService.pendenteEnvio(req.user.tenantId);
  }

  // GET /doses/:id
  @Get(':id')
  buscar(@Request() req, @Param('id') id: string) {
    return this.dosesService.buscar(req.user.tenantId, id);
  }

  // POST /doses
  @Post()
  criar(@Request() req, @Body() dto: CriarLeituraDto) {
    return this.dosesService.criar(req.user.tenantId, dto, req.user.userId);
  }

  // PATCH /doses/:id
  @Patch(':id')
  atualizar(@Request() req, @Param('id') id: string, @Body() dto: AtualizarLeituraDto) {
    return this.dosesService.atualizar(req.user.tenantId, id, dto);
  }

  // POST /doses/:id/enviar
  @Post(':id/enviar')
  @HttpCode(HttpStatus.OK)
  marcarEnvio(@Request() req, @Param('id') id: string, @Body() dto: MarcarEnvioDto) {
    return this.dosesService.marcarEnvio(req.user.tenantId, id, dto);
  }

  // DELETE /doses/:id
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  excluir(@Request() req, @Param('id') id: string) {
    return this.dosesService.excluir(req.user.tenantId, id);
  }
}
