import { useState, useMemo } from 'react';
import { Text, TextInput, Flex, Badge, TabList, Tab, Table, TableBody, TableRow, TableCell, TableHead, Button } from '@tremor/react';
import haversine from 'haversine';

import { regionFromNeonUrl } from '../util/neonUrl';
import awsRegions from '../data/aws-regions.json';
import vercelRegions from '../data/vercel-regions.json';
import neonIcon from '../components/neon-icon';
import TextLatencies from '@/components/text-latencies';

const localMock = true;

type VercelRegions = typeof vercelRegions;
type VercelRegion = keyof VercelRegions;
type VercelRegionsWithDistance = { [RegionId in VercelRegion]: VercelRegions[RegionId] & { km?: number } };

enum DisplayLatency {  // binary
  ClientToEdge = 1,
  EdgeToNeon = 2,
  Combined = 3,  // = ClientToEdge + EdgeToNeon
}

enum RunStage {
  Idle,
  ConnectionTest,
  Latencies,
}

enum EdgeProvider {
  Vercel = 'Vercel',
}

const errIntro = 'Sorry, an error occured.';
const emptyLatencies = Object.fromEntries(
  Object.entries(vercelRegions).map(([k]) => [k, { clientToEdge: [] as number[], edgeToNeon: [] as number[] }])
);

export default function Page() {
  const [edgeProvider, setEdgeProvider] = useState(EdgeProvider.Vercel);
  const [dbUrl, setDbUrl] = useState('');
  const [runStage, setRunStage] = useState(RunStage.Idle);
  const [errMsg, setErrMsg] = useState('');
  const [displayLatency, setDisplayLatency] = useState(DisplayLatency.EdgeToNeon);
  const [queryCount, setQueryCount] = useState(21);
  const [latencies, setLatencies] = useState(emptyLatencies);

  const neonAwsRegionId = useMemo(() => regionFromNeonUrl(dbUrl), [dbUrl]);
  const neonAwsRegion = neonAwsRegionId && awsRegions[neonAwsRegionId];

  // get km distance to each Vercel region from Neon DB
  const vercelRegionsWithDistance = useMemo(() =>
    Object.fromEntries(Object.entries(vercelRegions).map(([vercelRegionId, vercelRegion]) =>
      [vercelRegionId, { ...vercelRegion, km: neonAwsRegion ? haversine(vercelRegion, neonAwsRegion) : 0 }])),
    [neonAwsRegionId]) as VercelRegionsWithDistance;

  // extract and sort region keys by distance (ascending)
  const vercelRegionIds = Object.keys(vercelRegions) as VercelRegion[];
  if (neonAwsRegion) vercelRegionIds.sort((a, b) =>
    vercelRegionsWithDistance[a].km - vercelRegionsWithDistance[b].km);

  const showError = (source: 'Browser' | 'Server', msg: string) => {
    setErrMsg(`${errIntro} ${source}: ${msg}`);
    setRunStage(RunStage.Idle);
  };

  const testConnection = async () => {
    setLatencies(emptyLatencies);
    if (localMock) return checkLatencies();
    try {
      setRunStage(RunStage.ConnectionTest);
      const res = await fetch('/api/nearest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trials: 1, database: dbUrl, pipelineConnect: false }),
      });
      const data = await res.json();
      if (data.error) return showError('Server', data.error);

      checkLatencies();

    } catch (err) {
      showError('Browser', err.message);
    }
  };

  const checkLatencies = async () => {
    try {
      setRunStage(RunStage.Latencies);
      for (const vercelRegionId of vercelRegionIds) {
        for (let i = 0; i < queryCount; i++) {
          let data;
          let duration;

          if (localMock) {
            duration = 5 + Math.random() * 20;
            const tEdgeToNeon = 5 + Math.random() * 20;
            await new Promise(resolve => setTimeout(resolve, duration + tEdgeToNeon));
            data = { durations: [tEdgeToNeon] };

          } else {
            const t0 = Date.now();
            const res = await fetch(`/api/${vercelRegionId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ trials: 1, database: dbUrl, pipelineConnect: "password" }),
            });
            duration = Date.now() - t0;
            data = await res.json();
            if (data.error) return showError('Server', data.error);
          }

          setLatencies(latencies => ({
            ...latencies,
            [vercelRegionId]: {
              clientToEdge: [...latencies[vercelRegionId].clientToEdge, duration],
              edgeToNeon: [...latencies[vercelRegionId].clientToEdge, ...data.durations],
            }
          }));
        }
      }
      setRunStage(RunStage.Idle);

    } catch (err) {
      showError('Browser', err.message);
    }
  };

  return (
    <main>
      <label htmlFor='dbUrl' className='grow'><Text className='mb-1'>Neon connection string</Text></label>
      <TextInput
        id='dbUrl'
        icon={neonIcon}
        placeholder='postgres://username:password@endpoint.region.neon.tld/neondb'
        value={dbUrl}
        disabled={runStage > RunStage.Idle}
        errorMessage={errMsg}
        error={!!errMsg}
        onChange={e => {
          setDbUrl(e.target.value);
          setErrMsg('');
        }}
        className='mr-2' />

      {neonAwsRegionId !== undefined && <Flex className='mt-1'>
        <Badge className='mr-2' color={neonAwsRegionId ? 'blue' : 'gray'}>{neonAwsRegionId ? neonAwsRegion.name : 'n/a'}</Badge>
        <Text className='grow'>{neonAwsRegionId ? neonAwsRegion.location : 'Incomplete or invalid connection string'}</Text>

        <Button
          className='mt-3'
          disabled={!neonAwsRegionId}
          loading={runStage > RunStage.Idle}
          onClick={testConnection}>
          {runStage === RunStage.Idle ? 'Run tests' :
            runStage === RunStage.ConnectionTest ? 'Connecting ...' :
              'Running ...'}
        </Button>
      </Flex>}

      <TabList value={edgeProvider} className='mt-4 mb-4'>
        {Object.entries(EdgeProvider).map(([k, v]) =>
          <Tab value={v} key={k} text={v} />
        )}
      </TabList>

      <Table>
        <TableHead><TableRow>
          <TableCell className='w-12'>Region</TableCell>
          <TableCell className='w-10'>Distance</TableCell>
          <TableCell>Latencies (ms)</TableCell>
        </TableRow></TableHead>
        <TableBody>
          {vercelRegionIds.map(vercelRegionId =>
            <TableRow key={vercelRegionId}>
              <TableCell>
                <Badge className='inline-block w-14 text-center mr-2'>{vercelRegionId}</Badge>
                <Text className='inline-block'>{vercelRegionsWithDistance[vercelRegionId].location}</Text>
              </TableCell>
              <TableCell>
                <Text>{neonAwsRegionId ? Number(vercelRegionsWithDistance[vercelRegionId].km.toPrecision(2)) + ' km' : '—'}</Text>
              </TableCell>
              <TableCell>
                <Text>
                  {latencies[vercelRegionId].edgeToNeon.length > 0 ?
                    <TextLatencies values={latencies[vercelRegionId].edgeToNeon} total={queryCount} /> :
                    runStage === RunStage.Latencies ? 'Waiting ...' : '—'}
                </Text>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </main>
  );
}
