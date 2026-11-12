import { useEffect, useRef } from 'react';
import { init, use as registerEChartsModules } from 'echarts/core';
import type { EChartsOption } from 'echarts';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

registerEChartsModules([BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

export type PointsChartDatum = {
  name: string;
  value: number;
};

type PointsChartProps = {
  data: PointsChartDatum[];
  ariaLabel?: string;
  valueSuffix?: string;
};

export default function PointsChart({
  data,
  ariaLabel = 'Comparativo de puntuaciones de participantes',
  valueSuffix = 'puntos',
}: PointsChartProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !data.length) return;

    const chart = init(host, undefined, { renderer: 'canvas' });
    const maxValue = Math.max(1, ...data.map((item) => item.value));

    const option: EChartsOption = {
      animationDuration: 420,
      aria: {
        enabled: true,
        description: ariaLabel,
      },
      grid: {
        left: 8,
        right: 22,
        top: 12,
        bottom: 10,
        containLabel: true,
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: '#ffffff',
        borderColor: '#dce9e1',
        textStyle: { color: '#263d31', fontSize: 11 },
        valueFormatter: (value) => `${Number(value).toLocaleString('es-CO')} ${valueSuffix}`,
      },
      xAxis: {
        type: 'value',
        min: 0,
        max: Math.ceil(maxValue * 1.15),
        axisLabel: { color: '#7a8a80', fontSize: 10 },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          lineStyle: { color: '#e7eee9', type: 'dashed' },
        },
      },
      yAxis: {
        type: 'category',
        inverse: true,
        data: data.map((item) => item.name),
        axisLabel: {
          color: '#596e61',
          fontSize: 10,
          width: 116,
          overflow: 'truncate',
        },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          type: 'bar',
          data: data.map((item) => item.value),
          barMaxWidth: 18,
          showBackground: true,
          backgroundStyle: {
            color: '#edf3ef',
            borderRadius: [0, 8, 8, 0],
          },
          itemStyle: {
            color: '#17a86b',
            borderRadius: [0, 8, 8, 0],
          },
          emphasis: {
            itemStyle: { color: '#128457' },
          },
        },
      ],
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(handleResize);
      observer.observe(host);
    } else {
      window.addEventListener('resize', handleResize);
    }

    return () => {
      observer?.disconnect();
      if (!observer) window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [ariaLabel, data, valueSuffix]);

  return (
    <div
      ref={hostRef}
      role="img"
      aria-label={ariaLabel}
      style={{ width: '100%', height: Math.max(220, Math.min(330, data.length * 44)) }}
    />
  );
}
