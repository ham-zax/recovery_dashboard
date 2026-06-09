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
}

export function ComplianceChart({ data }: ComplianceChartProps) {
  const labels = data.map((d) => d.displayDate);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Daily Check-In Compliance (%)',
        data: data.map((d) => d.compliance),
        backgroundColor: 'rgba(52, 211, 153, 0.2)', // accent-green with opacity
        borderColor: '#34d399', // accent-green
        borderWidth: 1,
        borderRadius: 4,
        hoverBackgroundColor: 'rgba(52, 211, 153, 0.4)',
        hoverBorderColor: '#34d399',
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: {
          color: '#2a2a2a',
          drawOnChartArea: false,
        },
        ticks: {
          color: '#888888',
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
          color: '#2a2a2a',
        },
        ticks: {
          color: '#888888',
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
          color: '#888888',
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
        backgroundColor: '#1a1a1a',
        titleColor: '#e5e5e5',
        bodyColor: '#e5e5e5',
        borderColor: '#2a2a2a',
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
    <div className="w-full h-48 bg-bg-card border border-border rounded-xl p-6">
      <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">
        Daily Check-In Compliance Trend
      </h3>
      <div className="w-full h-[calc(100%-2rem)]">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
