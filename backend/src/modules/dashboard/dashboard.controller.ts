import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';

@Controller('api/admin/dashboard')
@UseGuards(AuthGuard('jwt'))
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('overview')
  getOverview() {
    return this.dashboardService.getOverview();
  }

  @Get('chart')
  getChartData(
    @Query('type') type?: 'daily' | 'monthly',
    @Query('days') days?: string,
  ) {
    return this.dashboardService.getChartData(
      type || 'daily',
      days ? parseInt(days) : 30,
    );
  }
}
