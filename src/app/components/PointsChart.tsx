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
};

export default function PointsChart({
  data,
  ariaLabel = 'Comparativo de puntuaciones de participantes',
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
        backgroundColor: '#071a30',
        borderColor: 'rgba(104, 169, 231, 0.38)',
        textStyle: { color: '#edf6ff', fontSize: 11 },
        valueFormatter: (value) => `${Number(value).toLocaleString('es-CO')} puntos`,
      },
      xAxis: {
        type: 'value',
        min: 0,
        max: Math.ceil(maxValue * 1.15),
        axisLabel: { color: '#829bb9', fontSize: 10 },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          lineStyle: { color: 'rgba(125, 164, 207, 0.14)', type: 'dashed' },
        },
      },
      yAxis: {
        type: 'category',
        inverse: true,
        data: data.map((item) => item.name),
        axisLabel: {
          color: '#c5d9f1',
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
            color: 'rgba(92, 130, 173, 0.12)',
            borderRadius: [0, 8, 8, 0],
          },
          itemStyle: {
            color: '#35a8f5',
            borderRadius: [0, 8, 8, 0],
          },
          emphasis: {
            itemStyle: { color: '#68c9ff' },
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
  }, [ariaLabel, data]);

  return (
    <div
      ref={hostRef}
      role="img"
      aria-label={ariaLabel}
      style={{ width: '100%', height: Math.max(220, Math.min(330, data.length * 44)) }}
    />
  );
}
