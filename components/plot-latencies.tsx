import dynamic from 'next/dynamic';

// because of references to `self` etc. in plotly.js, this must only be loaded client-side
const Plot = dynamic(async () => (await import('react-plotly.js')).default, { ssr: false }) as any;

export default function PlotLatencies({ values, max, total }: { values: number[], max: number; total: number }) {
  return <Plot
    data={[{
      x: values.filter(v => v >= 0),
      type: 'box',
      boxpoints: 'outliers',
      // jitter: 0,
      // pointpos: 10,
      marker: { size: 5 },
      name: '',
      boxmean: true,
      line: { width: 1 },
      fillcolor: 'white',
    }]}
    layout={{
      height: 60,
      width: '100%',
      showlegend: false,
      margin: { l: 0, r: 0, b: 20, t: 0 },
      xaxis: {
        zeroline: false,
        range: [-10, max * 1.01],
        /*
        range: [Math.log10(5), Math.log10(max)],
        type: 'log',
        tickmode: 'array',
        tickvals: [
          10, 20, 40, 60, 80,
          100, 200, 400, 600, 800,
          1000, 2000, 4000, 8000,
          10000
        ],
        */
      },
    }}
    config={{
      staticPlot: true,
      displayModeBar: false,
    }}
  />;
};