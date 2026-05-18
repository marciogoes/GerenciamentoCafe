import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard }  from '../../common/guards/auth.guards';
import { GastosService } from './gastos.service';
import {
  CriarGastoDto, AtualizarGastoDto, PagarGastoDto, FiltrosGastoDto,
} from './dto/gastos.dto';

@UseGuards(JwtAuthGuard)
@Controller('gastos')
export class GastosController {
  constructor(private readonly gastosService: GastosService) {}

  // GET /gastos?categoria=&situacao=&competencia=&busca=
  @Get()
  listar(@Request() req, @Query() filtros: FiltrosGastoDto) {
    return this.gastosService.listar(req.user.tenantId, filtros);
  }

  // GET /gastos/kpi?competencia=2026-03-01
  @Get('kpi')
  kpi(@Request() req, @Query('competencia') competencia?: string) {
    return this.gastosService.kpiMes(req.user.tenantId, competencia);
  }

  // GET /gastos/evolucao?meses=6
  @Get('evolucao')
  evolucao(@Request() req, @Query('meses') meses?: string) {
    return this.gastosService.evolucaoMensal(req.user.tenantId, meses ? Number(meses) : 6);
  }

  // GET /gastos/vencendo?dias=7
  @Get('vencendo')
  vencendo(@Request() req, @Query('dias') dias?: string) {
    return this.gastosService.vencendoEm(req.user.tenantId, dias ? Number(dias) : 7);
  }

  // GET /gastos/:id
  @Get(':id')
  buscar(@Request() req, @Param('id') id: string) {
    return this.gastosService.buscar(req.user.tenantId, id);
  }

  // POST /gastos
  @Post()
  criar(@Request() req, @Body() dto: CriarGastoDto) {
    return this.gastosService.criar(req.user.tenantId, dto, req.user.userId);
  }

  // POST /gastos/duplicar-recorrentes
  @Post('duplicar-recorrentes')
  @HttpCode(HttpStatus.OK)
  duplicar(@Request() req, @Body('competencia') competencia: string) {
    return this.gastosService.duplicarRecorrentes(req.user.tenantId, competencia, req.user.userId);
  }

  // PATCH /gastos/:id
  @Patch(':id')
  atualizar(@Request() req, @Param('id') id: string, @Body() dto: AtualizarGastoDto) {
    return this.gastosService.atualizar(req.user.tenantId, id, dto);
  }

  // POST /gastos/:id/pagar
  @Post(':id/pagar')
  @HttpCode(HttpStatus.OK)
  pagar(@Request() req, @Param('id') id: string, @Body() dto: PagarGastoDto) {
    return this.gastosService.pagar(req.user.tenantId, id, dto);
  }

  // POST /gastos/:id/cancelar
  @Post(':id/cancelar')
  @HttpCode(HttpStatus.OK)
  cancelar(@Request() req, @Param('id') id: string) {
    return this.gastosService.cancelar(req.user.tenantId, id);
  }

  // DELETE /gastos/:id
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  excluir(@Request() req, @Param('id') id: string) {
    return this.gastosService.excluir(req.user.tenantId, id);
  }
}
