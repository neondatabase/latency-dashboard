import { Badge, Text } from '@tremor/react';

const errStr = 'Error';
const spacingClass = 'ml-1 mr-1'

export default function TextLatencies({ values, total }: { values: number[], total: number }) {
  let seenError = false;
  return <div className='mt-3'>
    <Text>In sequence: {values.map((t, i) => <span className={spacingClass} key={i}>{t < 0 ? errStr : t.toFixed(0)}</span>)}</Text>
    {values.length === total &&
      <Text>By latency: {[...values].sort((a, b) => a - b).map((t, i) => {
        // errors
        if (t < 0) {
          seenError = true;
          return <Badge key={i} className='mr-1 ml-1' color='red'>{errStr}</Badge>;
        }
        // non-errors
        const s = t.toFixed(0);
        return !seenError && (i === 1 || i === 5 || i === 10 || i === 15 || i === 19) ?
          <Badge key={i} className={spacingClass} color={i === 1 ? 'green' : i === 5 ? 'gray' : i === 10 ? 'blue' : i === 15 ? 'gray' : 'orange'}>{s}</Badge> :
          <span key={i} className={spacingClass}>{s}</span>;
      })}</Text>
    }
  </div>;
};