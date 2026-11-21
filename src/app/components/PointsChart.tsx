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

function readChartTheme() {
  const root = document.documentElement;
  const styles = window.getComputedStyle(root);
  const dark = root.dataset.theme === 'dark';
  const read = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;

  return {
    dark,
    brand: read('--jf-brand', dark ? '#ff783f' : '#e65b3f'),
    brandStrong: read('--jf-brand-strong', dark ? '#ff925f' : '#c94730'),
    ink: read('--jf-ink', dark ? '#f6eee9' : '#30221e'),
    muted: read('--jf-muted', dark ? '#b8aaa1' : '#806d64'),
    line: read('--jf-line', dark ? '#393431' : '#ead8cc'),
    surface: read('--jf-surface', dark ? '#1a1a1a' : '#fffaf6'),
    track: read('--jf-surface-3', dark ? '#302b28' : '#f1dfd3'),
  };
}

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

    const applyTheme = () => {
      const theme = readChartTheme();
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
          backgroundColor: theme.surface,
          borderColor: theme.line,
          textStyle: { color: theme.ink, fontSize: 11 },
          valueFormatter: (value) => `${Number(value).toLocaleString('es-CO')} ${valueSuffix}`,
        },
        xAxis: {
          type: 'value',
          min: 0,
          max: Math.ceil(maxValue * 1.15),
          axisLabel: { color: theme.muted, fontSize: 10 },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: {
            lineStyle: { color: theme.line, type: 'dashed' },
          },
        },
        yAxis: {
          type: 'category',
          inverse: true,
          data: data.map((item) => item.name),
          axisLabel: {
            color: theme.muted,
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
              color: theme.track,
              borderRadius: [0, 8, 8, 0],
            },
            itemStyle: {
              color: theme.brand,
              borderRadius: [0, 8, 8, 0],
            },
            emphasis: {
              itemStyle: { color: theme.brandStrong },
            },
          },
        ],
      };
      chart.setOption(option, { notMerge: true, lazyUpdate: true });
    };

    applyTheme();

    const handleResize = () => chart.resize();
    let resizeObserver: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(host);
    } else {
      window.addEventListener('resize', handleResize);
    }

    const themeObserver = typeof MutationObserver !== 'undefined'
      ? new MutationObserver(applyTheme)
      : undefined;
    themeObserver?.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });

    return () => {
      themeObserver?.disconnect();
      resizeObserver?.disconnect();
      if (!resizeObserver) window.removeEventListener('resize', handleResize);
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
