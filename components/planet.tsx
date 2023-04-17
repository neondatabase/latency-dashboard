import dynamic from 'next/dynamic';

// because of references to `self` etc. in plotly.js, this must only be loaded client-side
const Globe = dynamic(async () => (await import('react-globe.gl')).default, { ssr: false }) as any;

interface GlobeProps {
  arcs: {
    startLng: number;
    startLat: number;
    endLng: number;
    endLat: number;
  }[];
  labels: {
    text: string;
    lng: number;
    lat: number;
  }[];
  pov: {
    lat: number;
    lng: number;
    alt: number;
  };
}

export default function Planet({ arcs, labels, pov }: GlobeProps) {
  return (
    <Globe
      height={400}
      labelsData={labels}
      labelSize='size'
      arcsData={arcs}
      arcColor='color'
      arcStroke='stroke'
      arcTransitionDuration={0}
      arcAltitudeAutoScale={0.35}
      pointOfView={pov}
    />);
}