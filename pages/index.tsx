import { useState, useMemo } from 'react';
import { Card, Text, Title, TextInput, Flex, Badge, TabList, Tab, Table, TableBody, TableRow, TableCell, TableHead, Button, Toggle, ToggleItem } from '@tremor/react';
import haversine from 'haversine';

import { regionFromNeonUrl } from '../util/neonUrl';
import awsRegions from '../data/aws-regions.json';
import vercelRegions from '../data/vercel-regions.json';
import neonIcon from '../components/neon-icon';
import TextLatencies from '@/components/text-latencies';
import TextPercentiles from '@/components/text-percentiles';

type VercelRegions = typeof vercelRegions;
type VercelRegion = keyof VercelRegions;
type VercelRegionsWithDistance = { [RegionId in VercelRegion]: VercelRegions[RegionId] & { neonKm?: number; clientKm?: number; } };

enum DisplayLatency {
  EdgeToNeon = 'edgeToNeon',
  Total = 'total',
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
  Object.entries(vercelRegions).map(([k]) => [k, { total: [] as number[], edgeToNeon: [] as number[] }])
);

const formatKm = (km: number) => km < 0 ? '—' : (km < 100 ? '< 100' : Number(km.toPrecision(2)));

export default function Page() {
  const [edgeProvider, setEdgeProvider] = useState(EdgeProvider.Vercel);
  const [dbUrl, setDbUrl] = useState('');
  const [clientLocation, setClientLocation] = useState({ city: undefined, longitude: null, latitude: null });
  const [runStage, setRunStage] = useState(RunStage.Idle);
  const [errMsg, setErrMsg] = useState('');
  const [displayLatency, setDisplayLatency] = useState(DisplayLatency.EdgeToNeon);
  const [queryCount, setQueryCount] = useState(21);
  const [latencies, setLatencies] = useState(emptyLatencies);

  const localMock = typeof location === 'object' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1');

  const neonAwsRegionId = useMemo(() => regionFromNeonUrl(dbUrl), [dbUrl]);
  const neonAwsRegion = neonAwsRegionId && awsRegions[neonAwsRegionId];

  // get km distance to each Vercel region from Neon DB and browser
  const vercelRegionsWithDistance = useMemo(() =>
    Object.fromEntries(Object.entries(vercelRegions).map(([vercelRegionId, vercelRegion]) => [vercelRegionId, {
      ...vercelRegion,
      neonKm: neonAwsRegion ? haversine(vercelRegion, neonAwsRegion) : -1,
      clientKm: clientLocation.latitude ? haversine(vercelRegion, clientLocation) : -1,
    }])),
    [neonAwsRegionId, clientLocation]) as VercelRegionsWithDistance;

  // extract and sort region keys by distance (ascending)
  const vercelRegionIds = Object.keys(vercelRegions) as VercelRegion[];
  if (neonAwsRegion) vercelRegionIds.sort((a, b) =>
    vercelRegionsWithDistance[a].neonKm - vercelRegionsWithDistance[b].neonKm);

  const showError = (source: 'Browser' | 'Server', msg: string) => {
    setErrMsg(`${errIntro} ${source}: ${msg}`);
    setRunStage(RunStage.Idle);
  };

  const testConnection = async () => {
    setLatencies(emptyLatencies);
    if (localMock) {
      setClientLocation({ city: 'London', longitude: 0, latitude: 51.5 });
      return checkLatencies();
    }

    try {
      setRunStage(RunStage.ConnectionTest);
      const res = await fetch('/api/nearest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trials: 1, database: dbUrl, pipelineConnect: false }),
      });
      const data = await res.json();
      if (data.error) return showError('Server', data.error);
      setClientLocation(data.location);
      checkLatencies();

    } catch (err) {
      showError('Browser', err.message);
    }
  };

  const checkLatencies = async () => {
    setRunStage(RunStage.Latencies);
    for (const vercelRegionId of vercelRegionIds) {
      for (let i = 0; i < queryCount; i++) {

        void (async function () {  // don't await this
          let data, tTotal;

          try {
            if (localMock) {
              const tEdgeToNeon = 5 + 10 * Math.random() + (2 + Math.random()) * vercelRegionsWithDistance[vercelRegionId].neonKm / 30;
              tTotal = tEdgeToNeon + 10 + Math.random() * 50;
              await new Promise(resolve => setTimeout(resolve, tTotal));
              if (Math.random() < .005) throw new Error('Mock error: browser');
              data = Math.random() < .005 ? { error: 'Mock error: server' } : { durations: [tEdgeToNeon] };

            } else {
              const t0 = Date.now();
              const res = await fetch(`/api/${vercelRegionId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ trials: 1, database: dbUrl, pipelineConnect: 'password' }),
              });
              tTotal = Date.now() - t0;
              data = await res.json();
            }

            if (data.error) {
              console.error(data.error);
              data.durations = [-1];
              tTotal = -1;
            }

          } catch (err) {
            console.error(err.message);
            data = { durations: [-2] };
            tTotal = -2;
          }

          setLatencies(latencies => ({
            ...latencies,
            [vercelRegionId]: {
              total: [...latencies[vercelRegionId].total, tTotal],
              edgeToNeon: [...latencies[vercelRegionId].edgeToNeon, ...data.durations],
            }
          }));
        })();

        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    setRunStage(RunStage.Idle);
  };

  return (
    <main>
      <Title className='mb-5'>Neon latencies — work in progress</Title>
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

      {neonAwsRegionId !== undefined && <Flex>
        <Badge className='mr-2' color={neonAwsRegionId ? 'blue' : 'gray'}>{neonAwsRegionId ? neonAwsRegion.name : 'n/a'}</Badge>
        <Text>{neonAwsRegionId ? neonAwsRegion.location : 'Incomplete or invalid connection string'}</Text>
        <Text className='ml-4 mr-4'>|</Text>
        <Text className='grow'>Browser location: {clientLocation.city ?? 'unknown'}</Text>
        <Button
          className='mt-3'
          disabled={!neonAwsRegionId}
          loading={runStage > RunStage.Idle}
          onClick={testConnection}>
          {runStage === RunStage.Idle ? 'Start' :
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
          <TableCell className='w-10'>Distance (km)</TableCell>
          <TableCell>
            <Toggle value={displayLatency} onValueChange={(value: DisplayLatency) => setDisplayLatency(value)} className='ml-2'>
              <ToggleItem value={DisplayLatency.EdgeToNeon} text={`Edge <> Neon RTT (ms)`} />
              <ToggleItem value={DisplayLatency.Total} text={`Browser <> Edge <> Neon RTT (ms)`} />
            </Toggle>
          </TableCell>
        </TableRow></TableHead>
        <TableBody>
          {vercelRegionIds.map(vercelRegionId =>
            <TableRow key={vercelRegionId}>
              <TableCell>
                <Badge className='inline-block w-14 text-center mr-2'>{vercelRegionId}</Badge>
                <Text className='inline-block'>{vercelRegionsWithDistance[vercelRegionId].location}</Text>
              </TableCell>
              <TableCell>
                <Text>
                  {displayLatency === DisplayLatency.Total && formatKm(vercelRegionsWithDistance[vercelRegionId].clientKm) + ' + '}
                  {formatKm(vercelRegionsWithDistance[vercelRegionId].neonKm)}
                </Text>
              </TableCell>
              <TableCell>
                {latencies[vercelRegionId].edgeToNeon.length > 0 ?
                  <TextLatencies values={latencies[vercelRegionId][displayLatency]} total={queryCount} /> :
                  runStage === RunStage.Latencies ? 'Waiting ...' : '—'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <Card className='mt-5'><Flex>
        <Text className='mr-3'><b>Key to percentiles:</b></Text>
        <TextPercentiles />
        <span className='grow'></span>
      </Flex></Card>
    </main>
  );
}
