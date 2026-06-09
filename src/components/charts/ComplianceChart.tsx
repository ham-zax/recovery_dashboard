'use client';

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ChartDataPoint {
  date: string;
  displayDate: string;
  compliance: number;
}

interface ComplianceChartProps {
  data: ChartDataPoint[];
  title?: string;
}

export function ComplianceChart({ data, title = "Compliance Trend" }: ComplianceChartProps) {
  const labels = data.map((d) => d.displayDate);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Daily Check-In Compliance (%)',
        data: data.map((d) => d.compliance),
        backgroundColor: 'rgba(91, 154, 116, 0.2)', // muted sage with opacity
        borderColor: '#5B9A74', // muted sage
        borderWidth: 1,
        borderRadius: 4,
        hoverBackgroundColor: 'rgba(91, 154, 116, 0.4)',
        hoverBorderColor: '#5B9A74',
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: {
          color: '#18181c',
          drawOnChartArea: false,
        },
        ticks: {
          color: '#71717a',
          font: {
            family: 'JetBrains Mono',
            size: 9,
          },
        },
      },
      y: {
        min: 0,
        max: 100,
        grid: {
          color: '#18181c',
        },
        ticks: {
          color: '#71717a',
          stepSize: 50,
          callback: function (value) {
            return `${value}%`;
          },
          font: {
            family: 'JetBrains Mono',
            size: 9,
          },
        },
        title: {
          display: true,
          text: 'Compliance',
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
        display: false, // Clean look, title in card header is enough
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
            return `Compliance: ${context.raw}%`;
          },
        },
      },
    },
  };

  return (
    <div className="w-full h-64 linear-card rounded-xl p-6">
      <h3 className="text-[13px] font-medium text-text-primary tracking-wide mb-4">
        {title}
      </h3>
      <div className="w-full h-[calc(100%-2rem)]">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
