import { Text, Badge } from '@tremor/react';

export default function TextLatencies({ values, total }: { values: number[], total: number }) {
  return values.length < total ?
    values.map(t => <span className='ml-1 mr-1'>{t.toFixed(0)}</span>) :
    values.sort((a, b) => a - b).map((t, i) => {
      const s = t.toFixed(0);
      return i === 1 || i === 10 || i === 19 ?
        <Badge className='ml-1 mr-1' color={i === 1 ? 'green' : i === 10 ? 'blue' : 'orange'}>{s}</Badge> :
        <span className='ml-1 mr-1'>{s}</span>;
    })
};