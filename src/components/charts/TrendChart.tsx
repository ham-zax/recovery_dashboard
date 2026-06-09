'use client';

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartDataPoint {
  date: string;
  displayDate: string;
  pain: number | null;
  walked: number | null;
  reflux: number | null;
}

interface TrendChartProps {
  data: ChartDataPoint[];
  title?: string;
}

export function TrendChart({ data, title = "Pain & Activity Trends" }: TrendChartProps) {
  const labels = data.map((d) => d.displayDate);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Pain (0-10)',
        data: data.map((d) => d.pain),
        borderColor: '#D46A6A', // muted rose
        backgroundColor: 'rgba(212, 106, 106, 0.05)',
        tension: 0.25,
        yAxisID: 'yPain',
        fill: true,
        spanGaps: true,
      },
      {
        label: 'Reflux (0-10)',
        data: data.map((d) => d.reflux),
        borderColor: '#D6A35D', // muted gold
        backgroundColor: 'rgba(214, 163, 93, 0.05)',
        tension: 0.25,
        yAxisID: 'yPain',
        fill: true,
        spanGaps: true,
      },
      {
        label: 'Walked Today',
        data: data.map((d) => d.walked),
        borderColor: '#56C5E8', // muted sky
        backgroundColor: 'transparent',
        tension: 0.0,
        yAxisID: 'yWalk',
        fill: false,
        stepped: true,
        spanGaps: true,
        pointStyle: 'circle',
        pointRadius: 3,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: {
          color: '#18181c',
        },
        ticks: {
          color: '#71717a',
          font: {
            family: 'JetBrains Mono',
            size: 9,
          },
        },
      },
      yPain: {
        type: 'linear' as const,
        position: 'left' as const,
        min: 0,
        max: 10,
        grid: {
          color: '#18181c',
        },
        ticks: {
          color: '#71717a',
          stepSize: 2,
          font: {
            family: 'JetBrains Mono',
            size: 9,
          },
        },
        title: {
          display: true,
          text: 'Severity Level (0-10)',
          color: '#71717a',
          font: {
            family: 'Inter',
            size: 10,
            weight: 'bold',
          },
        },
      },
      yWalk: {
        type: 'linear' as const,
        position: 'right' as const,
        min: 0,
        max: 1.2,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: '#71717a',
          stepSize: 1,
          callback: function (value: string | number) {
            if (value === 1) return 'Yes';
            if (value === 0) return 'No';
            return '';
          },
          font: {
            family: 'JetBrains Mono',
            size: 9,
          },
        },
        title: {
          display: true,
          text: 'Walked Today',
          color: '#71717a',
          font: {
            family: 'Inter',
            size: 10,
            weight: 'bold',
          },
        },
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#a1a1aa',
          font: {
            family: 'Inter',
            size: 11,
          },
          boxWidth: 12,
        },
      },
      tooltip: {
        backgroundColor: '#121215',
        titleColor: '#f4f4f5',
        bodyColor: '#f4f4f5',
        borderColor: '#222227',
        borderWidth: 1,
        titleFont: {
          family: 'Inter',
          size: 11,
        },
        bodyFont: {
          family: 'JetBrains Mono',
          size: 11,
        },
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.datasetIndex === 2) {
              label += context.raw === 1 ? 'Yes' : 'No';
            } else {
              label += context.raw !== null ? (context.raw as number).toFixed(1) : 'No entry';
            }
            return label;
          },
        },
      },
    },
  };

  return (
    <div className="w-full h-80 linear-card rounded-xl p-6">
      <h3 className="text-[13px] font-medium text-text-primary tracking-wide mb-4">
        {title}
      </h3>
      <div className="w-full h-[calc(100%-2rem)]">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
