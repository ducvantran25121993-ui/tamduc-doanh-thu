import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Download,
  ChevronDown,
  ChevronRight,
  Filter,
  Layers,
  ArrowUpDown,
  Building2,
  AlertCircle,
  CheckCircle2,
  X,
  Sparkles,
  Maximize2,
  Minimize2,
  Calendar,
  RotateCcw,
} from 'lucide-react';
import { RegionData, ServiceData } from '../data/revenueData';
import { DisplayUnit, MonthTab } from '../types';
import { formatVND, formatPercent, exportToCSV, isVietKieuRegion } from '../utils/formatters';
import { DailyRecord } from '../services/googleSheetsService';
import { parseCustomRange, isCustomRange } from '../utils/quarterAggregator';

interface DayOption {
  key: number;
  dayNum: number;
  monthNum: number;
  label: string;
}

function normalizeServiceName(raw: string): string {
  if (!raw) return 'Khác';
  let s = raw.trim();
  if (s.startsWith('HCM-')) s = s.replace('HCM-', '');
  const upper = s.toUpperCase();
  if (upper === 'IMP' || upper === 'IMPLANT') return 'Implant';
  if (upper === 'NIỀNG' || upper === 'NIENG') return 'Niềng';
  if (upper === 'SỨ' || upper === 'SU') return 'Sứ';
  if (upper === 'TH' || upper === 'TQ' || upper === 'TỔNG HỢP' || upper === 'TONG HOP') return 'TH';
  if (upper === 'VIỆT KIỀU' || upper === 'VIET KIEU' || upper === 'VK') return 'Việt Kiều';
  return s;
}

function matchesRegion(recordRegion: string, regionName: string): boolean {
  if (!recordRegion || !regionName) return false;
  const a = recordRegion.toLowerCase().trim();
  const b = regionName.toLowerCase().trim();
  if (a === b) return true;
  if (
    (a === 'hcm' || a.includes('hồ chí minh')) &&
    (b === 'hcm' || b.includes('hồ chí minh'))
  ) return true;
  if (
    (a.includes('không') && (a.includes('địa chỉ') || a.includes('rõ'))) &&
    (b.includes('không') && (b.includes('địa chỉ') || b.includes('rõ')))
  ) return true;
  if (
    (a.includes('bình dương') || a === 'bd') &&
    (b.includes('bình dương') || b === 'bd')
  ) return true;
  if (
    (a.includes('biên hòa') || a === 'bh') &&
    (b.includes('biên hòa') || b === 'bh')
  ) return true;
  if (
    (a.includes('cần thơ') || a === 'ct') &&
    (b.includes('cần thơ') || b === 'ct')
  ) return true;
  if (
    (a.includes('đà nẵng') || a === 'đn') &&
    (b.includes('đà nẵng') || b === 'đn')
  ) return true;
  if (
    (a.includes('vũng tàu') || a === 'vt') &&
    (b.includes('vũng tàu') || b === 'vt')
  ) return true;
  return a.includes(b) || b.includes(a);
}

interface RegionalDetailTableProps {
  regions: RegionData[];
  monthLabel: string;
  displayUnit: DisplayUnit;
  selectedRegionFilter?: string | null;
  onClearRegionFilter?: () => void;
  selectedServiceFilter?: string | null;
  onClearServiceFilter?: () => void;
  onSelectRegionFilter?: (regionName: string | null) => void;
  dailyRecords?: DailyRecord[];
  activeMonth?: MonthTab;
}

export const RegionalDetailTable: React.FC<RegionalDetailTableProps> = ({
  regions,
  monthLabel,
  displayUnit,
  selectedRegionFilter,
  onClearRegionFilter,
  selectedServiceFilter,
  onClearServiceFilter,
  onSelectRegionFilter,
  dailyRecords = [],
  activeMonth,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRegions, setExpandedRegions] = useState<Record<string, boolean>>({});
  const [sortField, setSortField] = useState<'revenue' | 'costVAT' | 'profit' | 'ratio' | 'name' | 'dataTong' | 'dataChatLuong' | 'checkin' | 'dau' | 'rot'>('revenue');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [isFullHeight, setIsFullHeight] = useState<boolean>(true);

  // Extract month numbers associated with active view
  const activeMonthsList = useMemo<number[]>(() => {
    if (typeof activeMonth === 'number') return [activeMonth];
    if (activeMonth === 'q1') return [1, 2, 3];
    if (activeMonth === 'q2') return [4, 5, 6];
    if (activeMonth === 'q3') return [7, 8, 9];
    if (activeMonth === 'q4') return [10, 11];
    if (isCustomRange(activeMonth)) {
      const parsed = parseCustomRange(activeMonth);
      if (parsed && parsed.length > 0) return parsed;
    }
    const match = monthLabel.match(/\d+/);
    if (match) {
      const num = parseInt(match[0], 10);
      if (num >= 1 && num <= 12) return [num];
    }
    return [11];
  }, [activeMonth, monthLabel]);

  // Filter daily records matching active month(s)
  const relevantDailyRecords = useMemo(() => {
    if (!dailyRecords || dailyRecords.length === 0) return [];
    return dailyRecords.filter((r) => activeMonthsList.includes(r.monthNum));
  }, [dailyRecords, activeMonthsList]);

  // Generate available day options
  const availableDays = useMemo<DayOption[]>(() => {
    const list: DayOption[] = [];
    const keysSet = new Set<number>();

    if (relevantDailyRecords.length > 0) {
      relevantDailyRecords.forEach((r) => {
        const k = r.monthNum * 100 + r.dayNum;
        if (!keysSet.has(k)) {
          keysSet.add(k);
          list.push({
            key: k,
            dayNum: r.dayNum,
            monthNum: r.monthNum,
            label: `Ngày ${r.dayNum}/${r.monthNum}`,
          });
        }
      });
      list.sort((a, b) => a.key - b.key);
    }

    if (list.length === 0) {
      // Fallback days for the month(s)
      activeMonthsList.forEach((m) => {
        const daysInM = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m] || 30;
        for (let d = 1; d <= daysInM; d++) {
          const k = m * 100 + d;
          list.push({
            key: k,
            dayNum: d,
            monthNum: m,
            label: `Ngày ${d}/${m}`,
          });
        }
      });
    }

    return list;
  }, [relevantDailyRecords, activeMonthsList]);

  const minDayKey = availableDays.length > 0 ? availableDays[0].key : 1101;
  const maxDayKey = availableDays.length > 0 ? availableDays[availableDays.length - 1].key : 1110;

  const [startDayKey, setStartDayKey] = useState<number>(minDayKey);
  const [endDayKey, setEndDayKey] = useState<number>(maxDayKey);

  // Automatically reset date range when active month changes
  useEffect(() => {
    if (availableDays.length > 0) {
      setStartDayKey(availableDays[0].key);
      setEndDayKey(availableDays[availableDays.length - 1].key);
    }
  }, [activeMonth, monthLabel, availableDays.length, minDayKey, maxDayKey]);

  const isDateFilterActive = availableDays.length > 0 && (startDayKey !== minDayKey || endDayKey !== maxDayKey);
  const selectedDaysList = useMemo(() => {
    return availableDays.filter((d) => d.key >= startDayKey && d.key <= endDayKey);
  }, [availableDays, startDayKey, endDayKey]);
  const selectedDaysCount = selectedDaysList.length;

  const startDayLabel = availableDays.find((d) => d.key === startDayKey)?.label || `Ngày ${startDayKey % 100}`;
  const endDayLabel = availableDays.find((d) => d.key === endDayKey)?.label || `Ngày ${endDayKey % 100}`;

  // Filtered dataset according to active date range
  const displayRegions: RegionData[] = useMemo(() => {
    if (!isDateFilterActive) {
      return regions;
    }

    const recordsInRange = relevantDailyRecords.filter((r) => {
      const k = r.monthNum * 100 + r.dayNum;
      return k >= startDayKey && k <= endDayKey;
    });

    const totalDaysCount = Math.max(1, availableDays.length);
    const daysFraction = selectedDaysCount / totalDaysCount;

    return regions.map((r) => {
      const allRegRecords = relevantDailyRecords.filter((rec) => matchesRegion(rec.region, r.name));
      const inRangeRegRecords = recordsInRange.filter((rec) => matchesRegion(rec.region, r.name));

      if (allRegRecords.length > 0) {
        const filteredCostVAT = inRangeRegRecords.reduce((sum, rec) => sum + (rec.budgetVnd || 0), 0);
        const filteredDataTong = inRangeRegRecords.reduce((sum, rec) => sum + (rec.leadTho || 0), 0);
        const filteredDataCL = inRangeRegRecords.reduce((sum, rec) => sum + (rec.leadChatLuong || 0), 0);

        const regTotalDataAll = allRegRecords.reduce((sum, rec) => sum + (rec.leadTho || 0), 0);
        const regScale = regTotalDataAll > 0 ? filteredDataTong / regTotalDataAll : daysFraction;

        const updatedServices: ServiceData[] = r.services.map((svc) => {
          const normSvcName = normalizeServiceName(svc.name).toLowerCase();
          const svcRecordsInRange = inRangeRegRecords.filter(
            (rec) => normalizeServiceName(rec.service).toLowerCase() === normSvcName
          );
          const svcAllRecords = allRegRecords.filter(
            (rec) => normalizeServiceName(rec.service).toLowerCase() === normSvcName
          );

          const svcLeadTho = svcRecordsInRange.reduce((sum, rec) => sum + (rec.leadTho || 0), 0);
          const svcLeadCL = svcRecordsInRange.reduce((sum, rec) => sum + (rec.leadChatLuong || 0), 0);
          const svcCpHolder = svcRecordsInRange.reduce((sum, rec) => sum + (rec.budgetVnd || 0), 0);

          const svcTotalAll = svcAllRecords.reduce((sum, rec) => sum + (rec.leadTho || 0), 0);
          const svcScale = svcTotalAll > 0 ? svcLeadTho / svcTotalAll : regScale;

          const finalDataCount = svcAllRecords.length > 0 ? svcLeadTho : Math.round((svc.dataCount || 0) * regScale);
          const finalDataCL = svcAllRecords.length > 0 ? svcLeadCL : Math.round((svc.dataChatLuong || 0) * regScale);
          const finalCp = svcCpHolder > 0 ? svcCpHolder : Math.round((svc.cp || 0) * regScale);

          return {
            ...svc,
            dataCount: finalDataCount,
            dataChatLuong: finalDataCL,
            cp: finalCp,
            checkin: Math.round((svc.checkin || 0) * svcScale),
            dau: Math.round((svc.dau || 0) * svcScale),
            rot: Math.round((svc.rot || 0) * svcScale),
          };
        });

        const revenue = Math.round(r.revenue * regScale);
        const checkin = updatedServices.reduce((sum, s) => sum + (s.checkin || 0), 0) || Math.round((r.checkin || 0) * regScale);
        const dau = updatedServices.reduce((sum, s) => sum + (s.dau || 0), 0) || Math.round((r.dau || 0) * regScale);
        const rot = updatedServices.reduce((sum, s) => sum + (s.rot || 0), 0) || Math.round((r.rot || 0) * regScale);
        const cpDichVu = updatedServices.reduce((sum, s) => sum + (s.cp || 0), 0);
        const costVAT = filteredCostVAT > 0 ? filteredCostVAT : (cpDichVu || Math.round(r.costVAT * regScale));

        return {
          ...r,
          totalData: filteredDataTong > 0 ? filteredDataTong : updatedServices.reduce((sum, s) => sum + (s.dataCount || 0), 0),
          dataChatLuong: filteredDataCL > 0 ? filteredDataCL : updatedServices.reduce((sum, s) => sum + (s.dataChatLuong || 0), 0),
          costVAT,
          cpDichVu,
          revenue,
          checkin,
          dau,
          rot,
          services: updatedServices,
        };
      }

      // Fallback proportional scaling if region has no explicit daily rows
      const updatedServices = r.services.map((svc) => ({
        ...svc,
        dataCount: Math.round((svc.dataCount || 0) * daysFraction),
        dataChatLuong: Math.round((svc.dataChatLuong || 0) * daysFraction),
        cp: Math.round((svc.cp || 0) * daysFraction),
        checkin: Math.round((svc.checkin || 0) * daysFraction),
        dau: Math.round((svc.dau || 0) * daysFraction),
        rot: Math.round((svc.rot || 0) * daysFraction),
      }));

      return {
        ...r,
        totalData: Math.round((r.totalData || 0) * daysFraction),
        dataChatLuong: Math.round((r.dataChatLuong || 0) * daysFraction),
        costVAT: Math.round(r.costVAT * daysFraction),
        cpDichVu: Math.round((r.cpDichVu || r.costVAT) * daysFraction),
        revenue: Math.round(r.revenue * daysFraction),
        checkin: Math.round((r.checkin || 0) * daysFraction),
        dau: Math.round((r.dau || 0) * daysFraction),
        rot: Math.round((r.rot || 0) * daysFraction),
        services: updatedServices,
      };
    });
  }, [isDateFilterActive, regions, relevantDailyRecords, startDayKey, endDayKey, availableDays.length, selectedDaysCount]);

  // Auto-expand region when selected via Command Palette or Chart click
  useEffect(() => {
    if (selectedRegionFilter) {
      const matched = displayRegions.find(
        (r) =>
          r.name.toLowerCase().includes(selectedRegionFilter.toLowerCase()) ||
          selectedRegionFilter.toLowerCase().includes(r.name.toLowerCase())
      );
      if (matched) {
        setExpandedRegions((prev) => ({
          ...prev,
          [matched.name]: true,
        }));
      }
    }
  }, [selectedRegionFilter, displayRegions]);

  const toggleExpand = (regionName: string) => {
    setExpandedRegions((prev) => ({
      ...prev,
      [regionName]: !prev[regionName],
    }));
  };

  const handleSort = (field: 'revenue' | 'costVAT' | 'profit' | 'ratio' | 'name' | 'dataTong' | 'dataChatLuong' | 'checkin' | 'dau' | 'rot') => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Process rows
  const processedRegions = displayRegions
    .map((r) => {
      const revenue = r.revenue || 0;
      const costVAT = r.costVAT || 0;
      const profit = revenue - costVAT;
      const ratio = revenue > 0 ? (costVAT / revenue) * 100 : 0;
      const dataTong = r.services.reduce((sum, s) => sum + (s.dataCount || 0), 0) || r.totalData || 0;
      const dataChatLuong = r.dataChatLuong || 0;
      const tyLeCL = dataTong > 0 ? (dataChatLuong / dataTong) * 100 : 0;
      const cpPerData = dataTong > 0 ? costVAT / dataTong : 0;
      const checkin = r.checkin ?? r.services.reduce((sum, s) => sum + (s.checkin || 0), 0);
      const dau = r.dau ?? r.services.reduce((sum, s) => sum + (s.dau || 0), 0);
      const rot = r.rot ?? r.services.reduce((sum, s) => sum + (s.rot || 0), 0);
      const tyLeChot = checkin > 0 ? (dau / checkin) * 100 : 0;
      return {
        ...r,
        revenue,
        costVAT,
        profit,
        ratio,
        dataTong,
        dataChatLuong,
        tyLeCL,
        cpPerData,
        checkin,
        dau,
        rot,
        tyLeChot,
      };
    })
    .filter((r) => {
      const search = searchTerm.toLowerCase();
      const matchRegion = !searchTerm || r.name.toLowerCase().includes(search);
      const matchService = !searchTerm || r.services.some((s) => s.name.toLowerCase().includes(search));
      const matchSearch = matchRegion || matchService;

      let matchServiceFilter = true;
      if (selectedServiceFilter) {
        const targetSvc = selectedServiceFilter.toLowerCase();
        matchServiceFilter = r.services.some(
          (s) => s.name.toLowerCase().includes(targetSvc) || targetSvc.includes(s.name.toLowerCase())
        );
      }

      return matchSearch && matchServiceFilter;
    })
    .sort((a, b) => {
      let result = 0;
      if (sortField === 'name') result = a.name.localeCompare(b.name);
      else if (sortField === 'revenue') result = a.revenue - b.revenue;
      else if (sortField === 'costVAT') result = a.costVAT - b.costVAT;
      else if (sortField === 'profit') result = a.profit - b.profit;
      else if (sortField === 'ratio') result = a.ratio - b.ratio;
      else if (sortField === 'dataTong') result = a.dataTong - b.dataTong;
      else if (sortField === 'dataChatLuong') result = a.dataChatLuong - b.dataChatLuong;
      else if (sortField === 'checkin') result = a.checkin - b.checkin;
      else if (sortField === 'dau') result = a.dau - b.dau;
      else if (sortField === 'rot') result = a.rot - b.rot;
      return sortOrder === 'desc' ? -result : result;
    });

  // Calculate totals (excluding Việt Kiều revenue as requested)
  const totalRevenue = processedRegions.reduce((sum, r) => {
    if (isVietKieuRegion(r.name)) return sum;
    return sum + r.revenue;
  }, 0);
  const totalCostVAT = processedRegions.reduce((sum, r) => sum + r.costVAT, 0);
  const totalProfit = totalRevenue - totalCostVAT;
  const totalRatio = totalRevenue > 0 ? (totalCostVAT / totalRevenue) * 100 : 0;
  const totalDataTong = processedRegions.reduce((sum, r) => sum + r.dataTong, 0);
  const totalDataChatLuong = processedRegions.reduce((sum, r) => sum + r.dataChatLuong, 0);
  const totalCheckin = processedRegions.reduce((sum, r) => sum + r.checkin, 0);
  const totalDau = processedRegions.reduce((sum, r) => sum + r.dau, 0);
  const totalRot = processedRegions.reduce((sum, r) => sum + r.rot, 0);

  const handleExportCSV = () => {
    const csvRows = processedRegions.flatMap((r) => {
      if (r.services.length === 0) {
        return [
          {
            'Khu Vực': r.name,
            'Dịch Vụ': 'Tổng',
            'Data Dịch Vụ': r.dataTong,
            'Data CL': r.dataChatLuong,
            'Check-in': r.checkin,
            'Đậu': r.dau,
            'Rớt': r.rot,
            'Tỷ Lệ Chốt (%)': r.checkin > 0 ? `${r.tyLeChot.toFixed(1)}%` : '—',
            'Doanh Thu (VNĐ)': r.revenue,
            'Chi Phí VAT (VNĐ)': r.costVAT,
            'CP Dịch Vụ (VNĐ)': r.cpDichVu || 0,
            'CP Tổng (VNĐ)': r.cpTong || 0,
            'Lợi Nhuận (VNĐ)': r.profit,
            'Tỷ Lệ CP/DT (%)': r.ratio.toFixed(2),
          },
        ];
      }
      return r.services.map((s) => {
        const svcDataDV = s.dataCount || 0;
        const svcDataCL =
          s.dataChatLuong !== undefined
            ? s.dataChatLuong
            : r.dataTong > 0
            ? Math.round(svcDataDV * (r.dataChatLuong / r.dataTong))
            : svcDataDV;
        const svcCheckin = s.checkin || 0;
        const svcDau = s.dau || 0;
        const svcRot = s.rot || 0;
        return {
          'Khu Vực': r.name,
          'Dịch Vụ': s.name,
          'Data Dịch Vụ': svcDataDV,
          'Data CL': svcDataCL,
          'Check-in': svcCheckin,
          'Đậu': svcDau,
          'Rớt': svcRot,
          'Tỷ Lệ Chốt (%)': svcCheckin > 0 ? `${((svcDau / svcCheckin) * 100).toFixed(1)}%` : '—',
          'Doanh Thu (VNĐ)': r.revenue,
          'Chi Phí VAT (VNĐ)': r.costVAT,
          'CP Dịch Vụ (VNĐ)': s.cp,
          'Lợi Nhuận (VNĐ)': r.profit,
          'Tỷ Lệ CP/DT (%)': r.ratio.toFixed(2),
        };
      });
    });

    const dateSuffix = isDateFilterActive ? `_Tu_${startDayKey}_Den_${endDayKey}` : '';
    exportToCSV(`Bao_Cao_Khu_Vuc_${monthLabel.replace(/\s+/g, '_')}${dateSuffix}.csv`, csvRows);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg mt-6">
      {/* Table Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-400" />
            <span>Bảng Chi Tiết Doanh Thu & Chi Phí Theo Khu Vực</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {monthLabel}
            {isDateFilterActive && (
              <span className="text-emerald-400 font-semibold ml-1">
                • Lọc từ {startDayLabel} đến {endDayLabel} ({selectedDaysCount} ngày)
              </span>
            )}
            {' '}• Hiển thị dữ liệu chi tiết, các gói dịch vụ và tỷ lệ chi phí trên doanh thu
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Search bar */}
          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm khu vực hoặc dịch vụ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl pl-9 pr-3 py-2 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Height Toggle Button */}
          <button
            onClick={() => setIsFullHeight(!isFullHeight)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-3 py-2 rounded-xl text-xs font-semibold border border-slate-700 transition-all cursor-pointer shadow-sm"
            title={isFullHeight ? "Thu gọn về dạng khung cuộn 70vh" : "Mở rộng full chiều cao (hiển thị hết không cần cuộn)"}
          >
            {isFullHeight ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Thu gọn</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Nới rộng</span>
              </>
            )}
          </button>

          {/* CSV Export */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Xuất CSV</span>
          </button>
        </div>
      </div>

      {/* Date Filter Toolbar (Aligned Right) */}
      <div className="flex items-center justify-end mb-4">
        {/* Date Filter Range Control Widget (Matching User's Mockup) */}
        <div className="inline-flex items-center gap-1.5 sm:gap-2 text-xs bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 px-3 py-1.5 rounded-xl shadow-xs">
          <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-bold text-slate-800 dark:text-slate-200">Lọc Ngày:</span>
          <span className="text-slate-600 dark:text-slate-400 font-medium">Từ</span>
          <div className="relative inline-block">
            <select
              value={startDayKey}
              onChange={(e) => {
                const val = Number(e.target.value);
                setStartDayKey(val);
                if (val > endDayKey) setEndDayKey(val);
              }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-400 font-bold px-2.5 py-1 pr-6 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer text-xs shadow-xs appearance-none"
            >
              {availableDays.map((d) => (
                <option key={d.key} value={d.key} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {d.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <span className="text-slate-600 dark:text-slate-400 font-medium">đến</span>
          <div className="relative inline-block">
            <select
              value={endDayKey}
              onChange={(e) => {
                const val = Number(e.target.value);
                setEndDayKey(val);
                if (val < startDayKey) setStartDayKey(val);
              }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-400 font-bold px-2.5 py-1 pr-6 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer text-xs shadow-xs appearance-none"
            >
              {availableDays.map((d) => (
                <option key={d.key} value={d.key} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {d.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Reset button when active */}
          {isDateFilterActive && (
            <button
              onClick={() => {
                setStartDayKey(minDayKey);
                setEndDayKey(maxDayKey);
              }}
              className="ml-1 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-rose-500 rounded-md transition-colors cursor-pointer"
              title="Đặt lại xem toàn bộ ngày trong tháng"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Date Filter Active Notification Banner */}
      {isDateFilterActive && (
        <div className="flex items-center justify-between p-2.5 px-3.5 mb-4 rounded-xl bg-gradient-to-r from-emerald-950/70 to-slate-900 border border-emerald-500/40 text-xs shadow-md">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="text-emerald-300 font-semibold">Đang lọc theo ngày:</span>
            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> {startDayLabel} ➔ {endDayLabel} ({selectedDaysCount} ngày)
            </span>
            <span className="text-slate-400 text-[11px]">
              Số liệu Doanh Thu, Chi Phí, Data và Tỷ lệ đã được tính toán chính xác theo khoảng ngày được chọn.
            </span>
          </div>
          <button
            onClick={() => {
              setStartDayKey(minDayKey);
              setEndDayKey(maxDayKey);
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1 transition-all cursor-pointer shrink-0 ml-2"
          >
            <X className="w-3.5 h-3.5 text-rose-400" /> Bỏ lọc ngày
          </button>
        </div>
      )}

      {/* Cross-Filter Active Notification Banner */}
      {(selectedRegionFilter || selectedServiceFilter) && (
        <div className="flex items-center justify-between p-3 px-4 mb-4 rounded-xl bg-gradient-to-r from-cyan-950/80 to-slate-900 border border-cyan-500/40 text-xs shadow-md">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
            <span className="text-cyan-200 font-semibold">Đang lọc chéo tương tác:</span>
            {selectedRegionFilter && (
              <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" /> Cơ sở: {selectedRegionFilter}
              </span>
            )}
            {selectedServiceFilter && (
              <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Dịch vụ: {selectedServiceFilter}
              </span>
            )}
          </div>
          <button
            onClick={() => {
              onClearRegionFilter?.();
              onClearServiceFilter?.();
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1 transition-all cursor-pointer shrink-0 ml-2"
          >
            <X className="w-3.5 h-3.5 text-rose-400" /> Xóa bộ lọc
          </button>
        </div>
      )}

      {/* Table View */}
      <div className={`overflow-x-auto rounded-xl border border-slate-800 relative shadow-inner transition-all duration-300 ${
        isFullHeight ? 'max-h-none overflow-y-visible' : 'max-h-[70vh] overflow-y-auto'
      }`}>
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="sticky top-0 z-20 bg-slate-800 text-slate-300 uppercase tracking-wider font-semibold border-b border-slate-700 text-[11px] sm:text-xs shadow-md">
            <tr>
              <th className="py-3 px-3 w-10 whitespace-nowrap"></th>
              <th
                onClick={() => handleSort('name')}
                className="py-3 px-3 cursor-pointer hover:text-white whitespace-nowrap"
              >
                <div className="flex items-center gap-1 whitespace-nowrap">
                  <span>Khu Vực</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400 shrink-0" />
                </div>
              </th>
              <th
                onClick={() => handleSort('dataTong')}
                className="py-3 px-3 text-right cursor-pointer hover:text-white whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                  <span>Data Dịch Vụ</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400 shrink-0" />
                </div>
              </th>
              <th
                onClick={() => handleSort('dataChatLuong')}
                className="py-3 px-3 text-right cursor-pointer hover:text-white whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                  <span>Data CL</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400 shrink-0" />
                </div>
              </th>
              <th
                onClick={() => handleSort('checkin')}
                className="py-3 px-3 text-right cursor-pointer hover:text-white whitespace-nowrap"
                title="Tổng lượt khách đến khám Check-in và Tỷ lệ chốt (%)"
              >
                <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                  <span className="text-purple-300">Check-in (%)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400 shrink-0" />
                </div>
              </th>
              <th
                onClick={() => handleSort('dau')}
                className="py-3 px-3 text-right cursor-pointer hover:text-white whitespace-nowrap"
                title="Khách chốt thành công (Đậu)"
              >
                <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                  <span className="text-emerald-400">Đậu</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400 shrink-0" />
                </div>
              </th>
              <th
                onClick={() => handleSort('rot')}
                className="py-3 px-3 text-right cursor-pointer hover:text-white whitespace-nowrap"
                title="Khách không chốt (Rớt)"
              >
                <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                  <span className="text-rose-400">Rớt</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400 shrink-0" />
                </div>
              </th>
              <th
                onClick={() => handleSort('revenue')}
                className="py-3 px-3 text-right cursor-pointer hover:text-white whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                  <span>Doanh Thu</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400 shrink-0" />
                </div>
              </th>
              <th
                onClick={() => handleSort('costVAT')}
                className="py-3 px-3 text-right cursor-pointer hover:text-white whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                  <span>Chi Phí (VAT)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400 shrink-0" />
                </div>
              </th>
              <th
                onClick={() => handleSort('profit')}
                className="py-3 px-3 text-right cursor-pointer hover:text-white whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                  <span>Lợi Nhuận</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400 shrink-0" />
                </div>
              </th>
              <th
                onClick={() => handleSort('ratio')}
                className="py-3 px-3 text-center cursor-pointer hover:text-white whitespace-nowrap"
              >
                <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                  <span>% CP/DT (≤15%)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400 shrink-0" />
                </div>
              </th>
              <th className="py-3 px-3 text-center whitespace-nowrap">Dịch Vụ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
            {processedRegions.length === 0 ? (
              <tr>
                <td colSpan={12} className="text-center py-8 text-slate-500">
                  Không tìm thấy khu vực nào phù hợp với từ khóa "{searchTerm}".
                </td>
              </tr>
            ) : (
              processedRegions.map((r) => {
                const isExpanded = expandedRegions[r.name];
                const hasServices = r.services && r.services.length > 0;
                const isSelectedByFilter = Boolean(
                  selectedRegionFilter &&
                    (r.name.toLowerCase().includes(selectedRegionFilter.toLowerCase()) ||
                      selectedRegionFilter.toLowerCase().includes(r.name.toLowerCase()))
                );

                return (
                  <React.Fragment key={r.name}>
                    <tr
                      id={`region-row-${r.name.replace(/\s+/g, '-')}`}
                      onClick={() => hasServices && toggleExpand(r.name)}
                      className={`transition-all cursor-pointer ${
                        isSelectedByFilter
                          ? 'bg-cyan-950/50 border-l-4 border-l-cyan-400 font-semibold'
                          : isExpanded
                          ? 'bg-slate-800/40 hover:bg-slate-800/60'
                          : 'hover:bg-slate-800/50'
                      }`}
                    >
                      <td className="py-3 px-3 text-slate-500 text-center">
                        {hasServices ? (
                          isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-blue-400 inline" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400 inline" />
                          )
                        ) : null}
                      </td>
                      <td className="py-3 px-3 font-bold text-white text-sm whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{r.name}</span>
                          {isSelectedByFilter && (
                            <span className="px-1.5 py-0.5 text-[10px] rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold animate-pulse">
                              Đang lọc
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-cyan-400 text-sm whitespace-nowrap">
                        {r.dataTong.toLocaleString('vi-VN')}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-400 text-sm whitespace-nowrap">
                        {r.dataChatLuong.toLocaleString('vi-VN')}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-sm whitespace-nowrap" title={r.checkin > 0 ? `Check-in: ${r.checkin} | Đậu: ${r.dau} (${r.tyLeChot.toFixed(1)}%) | Rớt: ${r.rot}` : undefined}>
                        {r.checkin > 0 ? (
                          <div className="inline-flex items-baseline justify-end gap-1">
                            <span className="text-purple-300">
                              {r.checkin.toLocaleString('vi-VN')}
                            </span>
                            <span className="text-xs text-purple-400 font-semibold">
                              ({Math.round(r.tyLeChot)}%)
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-400 text-sm whitespace-nowrap">
                        {r.dau > 0 ? (
                          r.dau.toLocaleString('vi-VN')
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-rose-400 text-sm whitespace-nowrap">
                        {r.rot > 0 ? (
                          r.rot.toLocaleString('vi-VN')
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-400 text-sm whitespace-nowrap">
                        {formatVND(r.revenue, displayUnit)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-amber-400 text-sm whitespace-nowrap">
                        {formatVND(r.costVAT, displayUnit)}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-bold text-sm whitespace-nowrap ${
                          r.profit >= 0 ? 'text-blue-400' : 'text-rose-400'
                        }`}
                      >
                        {formatVND(r.profit, displayUnit)}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            r.ratio <= 15
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : r.ratio <= 35
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {r.ratio <= 15 ? (
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                          ) : (
                            <AlertCircle className="w-3 h-3 shrink-0" />
                          )}
                          {formatPercent(r.ratio)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center text-slate-400">
                        <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-md text-[11px] font-medium text-slate-300">
                          {r.services.length} gói dịch vụ
                        </span>
                      </td>
                    </tr>

                    {/* Sub-rows for Services if expanded */}
                    {isExpanded && (
                      <>
                        {r.services.map((svc, idx) => {
                          const svcDataDV = svc.dataCount || 0;
                          const svcDataCL =
                            svc.dataChatLuong && svc.dataChatLuong > 0
                              ? svc.dataChatLuong
                              : r.dataTong > 0 && r.dataChatLuong > 0
                              ? Math.round(svcDataDV * (r.dataChatLuong / r.dataTong))
                              : svcDataDV;
                          const isServiceMatch = Boolean(
                            selectedServiceFilter &&
                              (svc.name.toLowerCase().includes(selectedServiceFilter.toLowerCase()) ||
                                selectedServiceFilter.toLowerCase().includes(svc.name.toLowerCase()))
                          );

                          return (
                            <tr
                              key={`${r.name}-svc-${idx}`}
                              className={`transition-colors ${
                                isServiceMatch
                                  ? 'bg-amber-950/40 border-l-4 border-l-amber-400 text-amber-100 font-semibold'
                                  : 'bg-slate-950/60 border-l-2 border-l-blue-500 text-slate-400'
                              }`}
                            >
                              <td></td>
                              <td className="py-2.5 px-3 pl-8 flex items-center gap-2 font-medium whitespace-nowrap">
                                <Layers className={`w-3.5 h-3.5 shrink-0 ${isServiceMatch ? 'text-amber-400' : 'text-blue-400'}`} />
                                <span className={`whitespace-nowrap ${isServiceMatch ? 'text-amber-200' : 'text-slate-300'}`}>{svc.name}</span>
                                {isServiceMatch && (
                                  <span className="text-[10px] px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    Khớp dịch vụ
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-semibold text-cyan-300 whitespace-nowrap">
                                {svcDataDV ? `${svcDataDV.toLocaleString('vi-VN')} data` : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-semibold text-emerald-400 whitespace-nowrap">
                                {svcDataCL ? `${svcDataCL.toLocaleString('vi-VN')} data` : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-semibold text-purple-300 whitespace-nowrap">
                                {svc.checkin && svc.checkin > 0 ? (
                                  <div className="inline-flex items-baseline justify-end gap-1">
                                    <span>{svc.checkin.toLocaleString('vi-VN')}</span>
                                    <span className="text-xs text-purple-400 font-medium">
                                      ({Math.round(((svc.dau || 0) / svc.checkin) * 100)}%)
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-600">0</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-semibold text-emerald-400 whitespace-nowrap">
                                {svc.dau && svc.dau > 0 ? (
                                  svc.dau.toLocaleString('vi-VN')
                                ) : (
                                  <span className="text-slate-600">0</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-semibold text-rose-400 whitespace-nowrap">
                                {svc.rot && svc.rot > 0 ? (
                                  svc.rot.toLocaleString('vi-VN')
                                ) : (
                                  <span className="text-slate-600">0</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right text-slate-500 whitespace-nowrap">—</td>
                              <td className="py-2.5 px-3 text-right text-amber-300/90 font-medium whitespace-nowrap">
                                CP DV: {formatVND(svc.cp, displayUnit)}
                              </td>
                              <td className="py-2.5 px-3 text-right text-slate-500 whitespace-nowrap">—</td>
                              <td className="py-2.5 px-3 text-center text-slate-500 whitespace-nowrap">—</td>
                              <td></td>
                            </tr>
                          );
                        })}
                      </>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>

          {/* Table Footer with Summary */}
          {processedRegions.length > 0 && (
            <tfoot className="sticky bottom-0 z-20 bg-slate-800 backdrop-blur font-bold text-white border-t-2 border-rose-500 shadow-xl whitespace-nowrap">
              <tr>
                <td className="py-3 px-3 whitespace-nowrap"></td>
                <td className="py-3.5 px-3 text-sm font-extrabold uppercase text-slate-200 whitespace-nowrap">
                  TỔNG KHU VỰC
                  <span className="block text-[11px] normal-case text-emerald-400 font-normal whitespace-nowrap">
                    ({processedRegions.length} Khu Vực {isDateFilterActive ? `• ${startDayLabel} - ${endDayLabel}` : ''} • Đã trừ Doanh Thu Việt Kiều)
                  </span>
                </td>
                <td className="py-3.5 px-3 text-right text-cyan-400 text-base font-extrabold whitespace-nowrap">
                  {totalDataTong.toLocaleString('vi-VN')}
                </td>
                <td className="py-3.5 px-3 text-right text-emerald-400 text-base font-extrabold whitespace-nowrap">
                  {totalDataChatLuong.toLocaleString('vi-VN')}
                </td>
                <td className="py-3.5 px-3 text-right text-purple-300 text-base font-extrabold whitespace-nowrap" title={totalCheckin > 0 ? `Tổng Check-in: ${totalCheckin} | Đậu: ${totalDau} (${((totalDau / totalCheckin) * 100).toFixed(1)}%) | Rớt: ${totalRot}` : undefined}>
                  {totalCheckin > 0 ? (
                    <div className="inline-flex items-baseline justify-end gap-1">
                      <span>{totalCheckin.toLocaleString('vi-VN')}</span>
                      <span className="text-xs text-purple-400 font-bold">
                        ({Math.round((totalDau / totalCheckin) * 100)}%)
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-500">0</span>
                  )}
                </td>
                <td className="py-3.5 px-3 text-right text-emerald-400 text-base font-extrabold whitespace-nowrap">
                  {totalDau > 0 ? totalDau.toLocaleString('vi-VN') : (
                    <span className="text-slate-500">0</span>
                  )}
                </td>
                <td className="py-3.5 px-3 text-right text-rose-400 text-base font-extrabold whitespace-nowrap">
                  {totalRot > 0 ? totalRot.toLocaleString('vi-VN') : (
                    <span className="text-slate-500">0</span>
                  )}
                </td>
                <td className="py-3.5 px-3 text-right text-emerald-400 text-base font-extrabold whitespace-nowrap">
                  {formatVND(totalRevenue, displayUnit)}
                </td>
                <td className="py-3.5 px-3 text-right text-amber-400 text-base font-extrabold whitespace-nowrap">
                  {formatVND(totalCostVAT, displayUnit)}
                </td>
                <td
                  className={`py-3.5 px-3 text-right text-base font-extrabold whitespace-nowrap ${
                    totalProfit >= 0 ? 'text-blue-400' : 'text-rose-400'
                  }`}
                >
                  {formatVND(totalProfit, displayUnit)}
                </td>
                <td className="py-3.5 px-3 text-center whitespace-nowrap">
                  <span
                    className={`inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-xs font-black transition-all shadow-sm ${
                      totalRatio <= 15
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : totalRatio <= 35
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}
                    title={`Tỷ lệ chi phí trên doanh thu toàn hệ thống: ${formatPercent(totalRatio)} (${
                      totalRatio <= 15
                        ? 'Hiệu quả tối ưu - Đạt KPI'
                        : totalRatio <= 35
                        ? 'Mức trung bình'
                        : 'Chi phí cao cần tối ưu'
                    })`}
                  >
                    {totalRatio <= 15 ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{formatPercent(totalRatio)}</span>
                  </span>
                </td>
                <td className="py-3.5 px-3 text-center text-slate-400 text-xs font-semibold whitespace-nowrap">
                  {processedRegions.reduce((sum, r) => sum + r.services.length, 0)} gói DV
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};
