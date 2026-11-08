import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MONTHLY_DATA, MonthDataset } from './data/revenueData';
import { MonthTab, DisplayUnit } from './types';
import { KPISummary } from './components/KPISummary';
import { CostChart } from './components/CostChart';
import { RevenueChart } from './components/RevenueChart';
import { RegionDataChart } from './components/RegionDataChart';
import { ServiceDataChart } from './components/ServiceDataChart';
import { DailyDataChart } from './components/DailyDataChart';
import { CombinedChart } from './components/CombinedChart';
import { VietKieuChart } from './components/VietKieuChart';
import { RegionalDetailTable } from './components/RegionalDetailTable';
import { SixMonthOverview } from './components/SixMonthOverview';
import { SheetStatusBanner } from './components/SheetStatusBanner';
import { MonthNavigation } from './components/MonthNavigation';
import { QuarterSummaryBanner } from './components/QuarterSummaryBanner';
import { CustomRangeBanner } from './components/CustomRangeBanner';
import {
  isQuarterTab,
  getQuarterDataset,
  QuarterId,
  isCustomRange,
  parseCustomRange,
  getCustomRangeDataset,
} from './utils/quarterAggregator';
import {
  TrendingUp,
  DollarSign,
  Sun,
  Moon,
  Zap,
} from 'lucide-react';
import {
  fetchGoogleSheetData,
  DEFAULT_SHEET_URL,
  DailyRecord,
} from './services/googleSheetsService';
import { getCurrentVietnamMonth } from './utils/formatters';

export default function App() {
  const currentCalendarMonth = Math.min(getCurrentVietnamMonth(), 11);
  const defaultCurrentMonth = currentCalendarMonth >= 1 && currentCalendarMonth <= 11 ? currentCalendarMonth : 10;

  const [activeTab, setActiveTab] = useState<MonthTab>(() => {
    try {
      const saved = localStorage.getItem('revenue_app_month_tab');
      if (saved) {
        if (saved === 'overview' || saved === 'q1' || saved === 'q2' || saved === 'q3' || saved === 'q4') return saved as MonthTab;
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 11) return parsed as MonthTab;
      }
    } catch {}
    return currentCalendarMonth as MonthTab;
  });

  const handleSelectMonthTab = (tab: MonthTab) => {
    setActiveTab(tab);
    try {
      localStorage.setItem('revenue_app_month_tab', String(tab));
    } catch {}
  };

  const [displayUnit, setDisplayUnit] = useState<DisplayUnit>('full');
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');

  const toggleTheme = () => {
    const next = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(next);
    if (next === 'light') {
      document.documentElement.classList.add('theme-light');
    } else {
      document.documentElement.classList.remove('theme-light');
    }
  };

  // Google Sheet live synchronization state
  const [sheetUrl, setSheetUrl] = useState<string>(DEFAULT_SHEET_URL);
  const [monthlyDatasets, setMonthlyDatasets] = useState<MonthDataset[]>(() => MONTHLY_DATA);
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(true);

  // Filters
  const [selectedRegionFilter, setSelectedRegionFilter] = useState<string | null>(null);
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<string | null>(null);

  const loadSheetData = useCallback(async (url: string = sheetUrl) => {
    setIsFetching(true);
    const result = await fetchGoogleSheetData(url);
    if (result.monthlyData && result.monthlyData.length > 0) {
      setMonthlyDatasets(result.monthlyData);
    }
    setDailyRecords(result.dailyData);
    setLastUpdated(result.lastUpdated);
    setIsLive(result.isLive);
    setIsFetching(false);
  }, [sheetUrl]);

  useEffect(() => {
    document.title = "Báo Cáo Doanh Thu - Tâm Đức Smile";
    loadSheetData(sheetUrl);
  }, [sheetUrl, loadSheetData]);

  // Periodic Auto Refresh every 30 seconds
  useEffect(() => {
    if (!autoRefreshEnabled) return;
    const interval = setInterval(() => {
      loadSheetData(sheetUrl);
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefreshEnabled, sheetUrl, loadSheetData]);

  const isQuarter = isQuarterTab(activeTab);
  const isRange = isCustomRange(activeTab);
  const customMonths = useMemo(() => {
    return isRange ? parseCustomRange(activeTab) || [] : [];
  }, [isRange, activeTab]);

  const currentDataset: MonthDataset = useMemo(() => {
    if (isQuarterTab(activeTab)) {
      return getQuarterDataset(activeTab, monthlyDatasets);
    }
    if (isCustomRange(activeTab)) {
      const months = parseCustomRange(activeTab) || [];
      if (months.length > 0) {
        return getCustomRangeDataset(months, monthlyDatasets);
      }
    }
    const monthNum = typeof activeTab === 'number' ? activeTab : defaultCurrentMonth;
    return monthlyDatasets.find((m) => m.month === monthNum) || monthlyDatasets[0] || MONTHLY_DATA[0];
  }, [activeTab, monthlyDatasets, defaultCurrentMonth]);

  const currentMonthNum = typeof activeTab === 'number' ? activeTab : defaultCurrentMonth;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-blue-500 selection:text-white flex flex-col">
      {/* Top Header */}
      <header className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25 ring-1 ring-cyan-400/40">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Tâm Đức Smile</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-400/30 font-semibold hidden sm:inline-block">
                  Báo Cáo Doanh Thu
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Phân Tích Doanh Thu &amp; Chi Phí (VAT) Theo Khu Vực &amp; Dịch Vụ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Unit Selector */}
            <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700/80">
              <span className="text-xs text-slate-400 px-1 font-medium hidden sm:flex items-center">
                <DollarSign className="w-3.5 h-3.5" />
              </span>
              <button
                onClick={() => setDisplayUnit('full')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  displayUnit === 'full' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                VNĐ
              </button>
              <button
                onClick={() => setDisplayUnit('million')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  displayUnit === 'million' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Triệu
              </button>
              <button
                onClick={() => setDisplayUnit('billion')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  displayUnit === 'billion' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tỷ
              </button>
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition-colors"
              title={themeMode === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
            >
              {themeMode === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-400" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1650px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Month Navigation Tabs */}
        <MonthNavigation
          activeTab={activeTab}
          onSelectTab={handleSelectMonthTab}
          monthlyData={monthlyDatasets}
          displayUnit={displayUnit}
        />

        {/* Live Sheet Status Banner */}
        <SheetStatusBanner
          isLive={isLive}
          isFetching={isFetching}
          lastUpdated={lastUpdated}
          sheetUrl={sheetUrl}
          onRefresh={() => loadSheetData(sheetUrl)}
          onUpdateSheetUrl={(newUrl) => {
            setSheetUrl(newUrl);
            loadSheetData(newUrl);
          }}
          autoRefreshEnabled={autoRefreshEnabled}
          onToggleAutoRefresh={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
          userRole="admin"
        />

        {activeTab === 'overview' ? (
          <SixMonthOverview
            displayUnit={displayUnit}
            monthlyData={monthlyDatasets}
            dailyRecords={dailyRecords}
          />
        ) : currentDataset ? (
          <div className="space-y-6">
            {/* Quarter Banner */}
            {isQuarter && (
              <QuarterSummaryBanner
                quarterId={activeTab as QuarterId}
                monthlyData={monthlyDatasets}
                displayUnit={displayUnit}
                onSelectTab={handleSelectMonthTab}
              />
            )}

            {/* Custom Range Banner */}
            {isRange && customMonths.length > 0 && (
              <CustomRangeBanner
                months={customMonths}
                monthlyData={monthlyDatasets}
                displayUnit={displayUnit}
                onSelectTab={handleSelectMonthTab}
              />
            )}

            {/* Top KPI Summary */}
            <KPISummary
              monthData={currentDataset}
              displayUnit={displayUnit}
            />

            {/* Grid 1: Cost & Revenue by Region */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CostChart
                regions={currentDataset.regions}
                monthLabel={currentDataset.label}
                displayUnit={displayUnit}
              />
              <RevenueChart
                regions={currentDataset.regions}
                monthLabel={currentDataset.label}
                displayUnit={displayUnit}
              />
            </div>

            {/* Grid 2: Data by Region & Data by Service */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RegionDataChart
                regions={currentDataset.regions}
                monthLabel={currentDataset.label}
              />
              <ServiceDataChart
                regions={currentDataset.regions}
                monthLabel={currentDataset.label}
                displayUnit={displayUnit}
                selectedService={selectedServiceFilter}
                onSelectService={setSelectedServiceFilter}
              />
            </div>

            {/* Chart 5: Daily Data & Service Budget */}
            <DailyDataChart
              dailyRecords={dailyRecords}
              activeMonth={isQuarter || isRange ? (activeTab as any) : currentMonthNum}
              monthLabel={currentDataset.label}
              regions={currentDataset?.regions}
            />

            {/* Combined Revenue vs Cost VAT */}
            <CombinedChart
              regions={currentDataset.regions}
              monthLabel={currentDataset.label}
              displayUnit={displayUnit}
            />

            {/* Viet Kieu Revenue & Cost Chart */}
            <VietKieuChart
              monthlyData={monthlyDatasets}
              activeMonth={typeof activeTab === 'number' ? activeTab : undefined}
              displayUnit={displayUnit}
            />

            {/* Detailed Regional & Service Table */}
            <RegionalDetailTable
              regions={currentDataset.regions}
              monthLabel={currentDataset.label}
              displayUnit={displayUnit}
              selectedRegionFilter={selectedRegionFilter}
              onClearRegionFilter={() => setSelectedRegionFilter(null)}
              selectedServiceFilter={selectedServiceFilter}
              onClearServiceFilter={() => setSelectedServiceFilter(null)}
              onSelectRegionFilter={setSelectedRegionFilter}
              dailyRecords={dailyRecords}
              activeMonth={activeTab}
            />
          </div>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-[1650px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-slate-400 font-medium">Báo Cáo Doanh Thu Chuyên Biệt — Hệ Thống Nha Khoa Tâm Đức Smile</p>
          <p className="text-slate-600">© 2026 Team Google Ads. Tài Liệu Bảo Mật - Lưu Hành Nội Bộ</p>
        </div>
      </footer>
    </div>
  );
}
