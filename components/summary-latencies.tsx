import { Badge, Text } from '@tremor/react';

interface SummaryLatenciesProps {
  values: number[];
  total: number;
  started: boolean;
}

export default function SummaryLatencies({ values, total, started }: SummaryLatenciesProps) {
  if (values.length === 0 && !started) return undefined;
  if (values.length === 0) return <Text>Waiting ...</Text>;
  if (values.length < total) return <Text>{values.length} trials</Text>;

  const sortedValues = [...values].sort();
  if (sortedValues[0] < 0) return <Badge color='red'>Errors</Badge>;

  const median = sortedValues[10];
  const mean = sortedValues.reduce((memo, x) => memo + x) / sortedValues.length;
  return <Text>Mean:&nbsp;{mean.toFixed(0)}&nbsp;ms &nbsp;/&nbsp;&nbsp;Median:&nbsp;{median.toFixed(0)}&nbsp;ms</Text>
};