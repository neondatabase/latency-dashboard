import { useState, useMemo } from 'react';
import { Card, Text, Title, TextInput, Flex, Badge, Button, Toggle, ToggleItem } from '@tremor/react';
import haversine from 'haversine';

import { regionFromNeonUrl } from '../util/neonUrl';
import awsRegions from '../data/aws-regions.json';
import vercelRegions from '../data/vercel-regions.json';
import neonIcon from '../components/neon-icon';
import TextLatencies from '../components/text-latencies';
import PlotLatencies from '../components/plot-latencies';
import TextPercentiles from '../components/text-percentiles';
// import Planet from '../components/planet';


type VercelRegions = typeof vercelRegions;
type VercelRegion = keyof VercelRegions;
type VercelRegionsWithDistance = { [RegionId in VercelRegion]: VercelRegions[RegionId] & { neonKm?: number; clientKm?: number; } };

enum DisplayLatency {
  EdgeToNeon = 'edgeToNeon',
  Total = 'total',
}

enum Visualisation {
  BoxPlot = '0',
  RawNumbers = '1',
}

enum ScaleType {
  Linear = '0',
  Log = '1',
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

const formatKm = (km: number, units = true) => km < 0 ? '—' : (km < 100 ? '< 100' : Number(km.toPrecision(2))) + (units ? ' km' : '');

export default function Page() {
  const [edgeProvider, setEdgeProvider] = useState(EdgeProvider.Vercel);
  const [dbUrl, setDbUrl] = useState('');
  const [clientLocation, setClientLocation] = useState({ city: undefined, longitude: null, latitude: null });
  const [runStage, setRunStage] = useState(RunStage.Idle);
  const [errMsg, setErrMsg] = useState('');
  const [displayLatency, setDisplayLatency] = useState(DisplayLatency.EdgeToNeon);
  const [visualisation, setVisualisation] = useState(Visualisation.BoxPlot);
  const [scaleType, setScaleType] = useState(ScaleType.Linear);
  const [queryCount, setQueryCount] = useState(21);
  const [latencies, setLatencies] = useState(emptyLatencies);
  const [runningRegionId, setRunningRegionId] = useState<VercelRegion>();

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

  // calculate maximum latencies
  const latencyMax = useMemo(() =>
    Object.values(latencies).reduce((memo, l) => Math.max(memo, ...l[displayLatency]), 0),
    [latencies, displayLatency]
  );

  /*
  // make globe labels
  const labels = useMemo(() => Object.entries(vercelRegions).map(([vercelRegionId, vercelRegion]) => ({
    text: vercelRegionId,
    size: 1.5,
    lng: vercelRegion.longitude,
    lat: vercelRegion.latitude,
  })), []);

  // make globe arcs
  const arcs = useMemo(() => !neonAwsRegionId ? [] : Object.entries(vercelRegions).map(([vercelRegionId, vercelRegion]) => ({
    startLng: neonAwsRegion.longitude,
    startLat: neonAwsRegion.latitude,
    endLng: vercelRegion.longitude,
    endLat: vercelRegion.latitude,
    color: runningRegionId === vercelRegionId ? '#ff0' : '#aaa',
    stroke: runningRegionId === vercelRegionId ? 1 : undefined,
  })), [neonAwsRegionId, runningRegionId]);

  // make globe pov
  const pov = {
    lng: neonAwsRegionId ? neonAwsRegion.longitude : 0,
    lat: neonAwsRegionId ? neonAwsRegion.latitude : 0,
    alt: 100,
  };
  */

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
      setRunningRegionId(vercelRegionId);
      const regionPromises = [];

      for (let i = 0; i < queryCount; i++) {

        regionPromises.push((async function () {
          let data, tTotal;

          try {
            if (localMock) {
              const tEdgeToNeon = 5 + 10 * Math.random() + (2 + Math.random()) * vercelRegionsWithDistance[vercelRegionId].neonKm / 30;
              tTotal = tEdgeToNeon + 10 + Math.random() * 50;
              await new Promise(resolve => setTimeout(resolve, tTotal));
              if (Math.random() < .002) throw new Error('Mock error: browser');
              data = Math.random() < .002 ? { error: 'Mock error: server' } : { durations: [tEdgeToNeon] };

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
        })());

        await new Promise(resolve => setTimeout(resolve, 100));  // we pause briefly between each test ...
      }

      await Promise.all(regionPromises); // ... and we wait for every test in the region to finish before starting on the next region
    }
    setRunningRegionId(undefined);
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

      {/*<div className='mt-5 mb-5'><Planet arcs={arcs} labels={labels} pov={pov} /></div>*/}

      <Flex className='mt-5 mb-5'>
        <div>
          <Text className='mb-1'>Show round-trip times</Text>
          <Toggle value={displayLatency} onValueChange={(value: DisplayLatency) => setDisplayLatency(value)}>
            <ToggleItem value={DisplayLatency.EdgeToNeon} text={`Edge <> Neon`} />
            <ToggleItem value={DisplayLatency.Total} text={`Browser <> Edge <> Neon`} />
          </Toggle>
        </div>
        <div className='ml-5'>
          <Text className='mb-1'>Visualisation</Text>
          <Toggle value={visualisation} onValueChange={(value: Visualisation) => setVisualisation(value)}>
            <ToggleItem value={Visualisation.BoxPlot} text={`Box plot`} />
            <ToggleItem value={Visualisation.RawNumbers} text={`Raw numbers`} />
          </Toggle>
        </div>
        {visualisation === Visualisation.BoxPlot && <div className='ml-5'>
          <Text className='mb-1'>Box-plot scale</Text>
          <Toggle value={scaleType} onValueChange={(value: ScaleType) => setScaleType(value)}>
            <ToggleItem value={ScaleType.Linear} text={`Linear`} />
            <ToggleItem value={ScaleType.Log} text={`Log`} />
          </Toggle>
        </div>}
        <div className='grow'></div>
      </Flex>

      {vercelRegionIds.map(vercelRegionId =>
        <Card key={vercelRegionId} className='p-4 mb-2' decoration={vercelRegionId === runningRegionId && 'left'}>
          <div style={{ width: '100%' }}>
            <Flex>
              <Badge className='inline-block w-14 text-center mr-2'>{vercelRegionId}</Badge>
              <Text className='inline-block grow text-left'>{vercelRegionsWithDistance[vercelRegionId].location}
                {' '}
                ({displayLatency === DisplayLatency.Total && formatKm(vercelRegionsWithDistance[vercelRegionId].clientKm, false) + ' + '}
                {formatKm(vercelRegionsWithDistance[vercelRegionId].neonKm)})
              </Text>
            </Flex>
            <div className='mt-1'>
              {latencies[vercelRegionId].edgeToNeon.length === 0 ?
                <Text>{runStage === RunStage.Latencies ? 'Waiting ...' : '—'}</Text> :
                visualisation === Visualisation.BoxPlot ?
                  <PlotLatencies
                    values={latencies[vercelRegionId][displayLatency]}
                    max={latencyMax}
                    total={queryCount}
                    scale={scaleType === ScaleType.Linear ? 'linear' : 'log'} /> :
                  <TextLatencies
                    values={latencies[vercelRegionId][displayLatency]}
                    total={queryCount} />}
            </div>
          </div>
        </Card>
      )}

      {visualisation === Visualisation.RawNumbers && <Card className='mt-5'><Flex>
        <Text className='mr-3'><b>Key to percentiles:</b></Text>
        <TextPercentiles />
        <span className='grow'></span>
      </Flex></Card>}

    </main >
  );
}
