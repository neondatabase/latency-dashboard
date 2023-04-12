import { Badge } from '@tremor/react';

export default function TextLatencies({ values, total }: { values: number[], total: number }) {
  return <>{values.length < total ?
    values.map(t => <span className='ml-1 mr-1'>{t.toFixed(0)}</span>) :
    values.sort((a, b) => a - b).map((t, i) => {
      const s = t.toFixed(0);
      return i === 1 || i === 5 || i === 10 || i === 15 || i === 19 ?
        <Badge className='mr-1 ml-1' color={i === 1 ? 'green' : i === 5 ? 'gray' : i === 10 ? 'blue' : i === 15 ? 'gray' : 'orange'}>{s}</Badge> :
        <span className='mr-1 ml-1'>{s}</span>;
    })}</>;
};