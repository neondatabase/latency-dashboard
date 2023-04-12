import { useCallback, useState } from 'react';
import { Card, Icon, Text, TextInput, Flex, Badge, TabList, Tab, Table, TableBody, TableRow, TableCell, TableHead, Button } from '@tremor/react';
import haversine from 'haversine';

import { regionFromNeonUrl } from '../util/neonUrl';
import awsRegions from '../data/aws-regions.json';
import vercelRegions from '../data/vercel-regions.json';
import neonIcon from '../components/neon-icon';

type VercelRegions = typeof vercelRegions;
type VercelRegionsWithDistance = {
  [RegionId in keyof VercelRegions]: VercelRegions[RegionId] & { km?: number }
};

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

export default function Page() {
  const [edgeProvider, setEdgeProvider] = useState(EdgeProvider.Vercel);
  const [dbUrl, setDbUrl] = useState('');
  const [runStage, setRunStage] = useState(RunStage.Idle);
  const [connectionErr, setConnectionErr] = useState('');
  const [displayLatency, setDisplayLatency] = useState(DisplayLatency.EdgeToNeon);
  const [queryCount, setQueryCount] = useState(21);
  const [latencies, setLatencies] = useState(Object.fromEntries(
    Object.entries(vercelRegions).map(([k]) => [k, { clientToEdge: [] as number[], edgeToNeon: [] as number[] }])
  ));

  const neonAwsRegionId = regionFromNeonUrl(dbUrl);
  const neonAwsRegion = neonAwsRegionId && awsRegions[neonAwsRegionId];

  const vercelRegionsWithDistance: VercelRegionsWithDistance = vercelRegions;
  Object.values(vercelRegionsWithDistance).forEach(vercelRegion => {
    vercelRegion.km = neonAwsRegion ? haversine(vercelRegion, neonAwsRegion) : 0;
  });
  const vercelRegionIds = Object.keys(vercelRegions);
  if (neonAwsRegion) vercelRegionIds.sort((a, b) =>
    vercelRegionsWithDistance[a].km - vercelRegionsWithDistance[b].km);

  const testConnection = useCallback(async () => {
    const errIntro = 'Sorry, an error occured.';
    try {
      setRunStage(RunStage.ConnectionTest);
      const start = Date.now();
      const res = await fetch('/api/nearest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trials: 1, database: dbUrl, pipelineConnect: false }),
      });
      const end = Date.now();
      const data = await res.json();

      
      if (data.error) {
        setConnectionErr(`${errIntro} Server: ${data.error}`);
        setRunStage(RunStage.Idle);
      } else {
        console.log(start, data, end);
      }

    } catch (err) {
      setConnectionErr(`${errIntro} Browser: ${err.message}.`);
      setRunStage(RunStage.Idle);
    }

  }, [dbUrl]);

  return (
    <main>
      <label htmlFor='dbUrl' className='grow'><Text className='mb-2'>Neon connection string</Text></label>
      <TextInput
        id='dbUrl'
        icon={neonIcon}
        placeholder='postgres://username:password@endpoint.region.neon.tld/neondb'
        value={dbUrl}
        disabled={runStage > RunStage.Idle}
        errorMessage={connectionErr}
        error={!!connectionErr}
        onChange={e => {
          setDbUrl(e.target.value);
          setConnectionErr('');
        }}
        className='mr-2' />

      {neonAwsRegionId !== undefined && <Flex className='mt-1'>
        {neonAwsRegionId && <Badge className='mr-2'>{neonAwsRegion.name}</Badge>}
        <Text className='grow'>{neonAwsRegionId ? neonAwsRegion.location : 'Incomplete or invalid connection string'}</Text>

        <Button
          className='mt-3'
          disabled={!neonAwsRegionId}
          loading={runStage > RunStage.Idle}
          onClick={event => testConnection()}>
          {runStage === RunStage.Idle ? 'Run tests' :
            runStage === RunStage.ConnectionTest ? 'Connecting ...' :
              'Running ...'}
        </Button>
      </Flex>}



      {/*<Card className='mt-3'>*/}
      <TabList value={edgeProvider} className='mt-4 mb-4'>
        {Object.entries(EdgeProvider).map(([k, v]) =>
          <Tab value={v} key={k} text={v} />
        )}
      </TabList>

      <Table>
        <TableHead><TableRow>
          <TableCell>Region</TableCell>
          <TableCell>Distance</TableCell>
          <TableCell>Latency</TableCell>
        </TableRow></TableHead>
        <TableBody>
          {vercelRegionIds.map(id =>
            <TableRow key={id}>
              <TableCell>
                <Badge className='inline-block w-14 text-center mr-2'>{id}</Badge>
                <Text className='inline-block'>{vercelRegionsWithDistance[id].location}</Text>
              </TableCell>
              <TableCell>
                <Text>{neonAwsRegionId ? Number(vercelRegionsWithDistance[id].km.toPrecision(2)) + ' km' : '—'}</Text>
              </TableCell>
              <TableCell>
                <Text>
                  {runStage === RunStage.Idle ? '—' :
                    runStage === RunStage.ConnectionTest ? 'Connecting ...' :
                      'Waiting ...'}
                </Text>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/*</Card>*/}
    </main>
  );
}
