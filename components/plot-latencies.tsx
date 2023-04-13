import dynamic from 'next/dynamic';

// because of references to `self` etc. in plotly.js, this must only be loaded client-side
const Plot = dynamic(async () => (await import('react-plotly.js')).default, { ssr: false }) as any;

export default function PlotLatencies({ values, max, total }: { values: number[], max: number; total: number }) {
  return <Plot
    data={[{
      x: values.filter(v => v >= 0),
      type: 'box',
      boxpoints: 'all',
      jitter: 0.33,
      pointpos: -3,
      name: '',
    }]}
    layout={{
      height: 60,
      width: '100%',
      showlegend: false,
      margin: { l: 3, r: 3, b: 20, t: 0 },
      xaxis: {
        range: [Math.log10(5), Math.log10(max)],
        type: 'log',
        tickmode: 'array',
        tickvals: [10, 20, 40, 80, 160, 320, 640, 1280, 2560, 5120, 10400],
      },
    }}
    config={{
      staticPlot: true,
      displayModeBar: false,
    }}
  />;
};