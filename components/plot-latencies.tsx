import dynamic from 'next/dynamic';

// because of references to `self` etc. in plotly.js, this must only be loaded client-side
const Plot = dynamic(async () => (await import('react-plotly.js')).default, { ssr: false }) as any;

interface PlotLatenciesProps {
  values: number[];
  max: number;
  total: number;
  scale: 'linear' | 'log';
}

export default function PlotLatencies({ values, max, total, scale }: PlotLatenciesProps) {
  return <Plot
    data={[{
      x: values.filter(v => v >= 0),
      type: 'box',
      boxpoints: 'all',
      jitter: .1,
      pointpos: 10,
      marker: { size: 5 },
      name: 'ms',
      boxmean: true,
      line: { width: 1, color: '#1d4ed8' },
      fillcolor: '#dbeafe',
      hovertemplate: '%{x:.0f} ms',
      hoveron: 'points',
    }]}
    style={{ width: '100% ' }}
    useResizeHandler={true}
    layout={{
      height: 60,
      autosize: true,
      showlegend: false,
      margin: { l: 20, r: 0, b: 20, t: 0 },
      xaxis: {
        zeroline: false,
        ...(scale === 'linear' ? {
          range: [0, max * 1.01],
        } : {
          range: [Math.log10(4), Math.log10(max * 2)],
          type: 'log',
          tickmode: 'array',
          tickvals: [
            5, 
            10, 20, 40, 60, 80,
            100, 200, 400, 600, 800,
            1000, 2000, 4000, 8000,
            10000, 20000, 40000, 80000
          ],
        }),
      },
    }}
    config={{
      displayModeBar: false,
    }}
  />;
};